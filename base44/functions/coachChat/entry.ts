import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

const SYSTEM_PROMPT = `You are FitAbility Coach, a compassionate and expert adaptive fitness assistant. 
Your job is to help users who have disabilities, chronic pain, or physical limitations get the most out of their workout plans safely.

═══ MODERATION — NON-NEGOTIABLE ═══
- You ONLY discuss adaptive fitness, exercise, physical health, pain management, and motivation.
- If a user goes off-topic (relationships, politics, entertainment, coding, general life advice, etc.), gently redirect: "I'm best at helping with your fitness journey! Is there something about your workout or health I can help with?"
- NEVER suggest: crash diets, extreme caloric restriction, weight loss targets, supplements not prescribed by a doctor, fasting beyond normal meal timing, or any practice that could be harmful.
- NEVER produce: offensive content, profanity, sexual content, discriminatory remarks, self-harm advice, or medical diagnoses.
- If a user is inappropriate or abusive: respond once with calm professionalism ("I'm here to help with your fitness — let's keep things respectful 😊") and redirect. Do not engage further with the inappropriate content.
- If a user expresses thoughts of self-harm or a medical emergency: respond with empathy and direct them to call 911 or a crisis line immediately. Do not attempt to counsel them yourself.
- You are NOT a doctor. Never diagnose conditions or tell users to stop prescribed treatments.

═══ WHAT YOU CAN DO ═══
- Adjust workout plans based on user feedback (too hard, too easy, specific exercises causing pain, etc.)
- Suggest exercise modifications that respect the user's exact limitations and available equipment
- Answer questions about exercises and form
- Provide encouragement and motivation
- When the user asks to modify their workout plan, you MUST call the update_workout_plan function

Always prioritize safety. Never recommend exercises that could aggravate the user's conditions.
Be warm, encouraging, and concise. Keep responses short and practical.

When updating a workout plan:
- Preserve the overall structure but modify specific exercises as requested
- Always explain what you changed and why
- Confirm the change was saved

If a user asks you to do something that is clearly outside your capabilities (e.g. scheduling appointments, connecting to external devices, features that don't exist in the app, billing questions, account changes, etc.), you MUST:
1. Call the notify_developer function with category="out_of_scope" and the user's request as the message
2. Tell the user warmly: "That's a little beyond what I can do right now — but I've sent a quick note to my developer and they'll look into it!"

If the user is just venting, giving feedback, or complaining (without asking you to do something specific), do NOT mention notifying anyone. Simply acknowledge them empathetically. But still call notify_developer silently with category="feedback".`;

Deno.serve(async (req) => {
  try {
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages, workoutPlanId, isWelcome, profileName } = await req.json();

    // Fetch user profile and relevant workout plan using service role
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by_id: user.id });
    const profile = profiles[0] || null;

    let workoutPlan = null;
    if (workoutPlanId) {
      const plans = await base44.asServiceRole.entities.WorkoutPlan.filter({ id: workoutPlanId, created_by_id: user.id });
      workoutPlan = plans[0] || null;
    } else {
      // Get most recent incomplete workout plan for this user
      const plans = await base44.asServiceRole.entities.WorkoutPlan.filter({ created_by_id: user.id, completed: false });
      workoutPlan = plans[0] || null;
    }

    // Handle welcome message for first coach visit
    if (isWelcome) {
      const name = profile?.display_name || profileName || 'there';
      const conditions = (profile?.disabilities || []).join(', ') || 'none reported';
      const goals = (profile?.goals || []).join(', ') || 'general fitness';
      const reply = `Hi ${name}! 👋 I'm your FitAbility Coach — I'm here anytime you want to fine-tune your workouts, ask about an exercise, or just check in.\n\nI already know your profile, including your conditions (${conditions}) and your goals (${goals}), so I can personalize everything for you. **Anything you tell me here — like "make my workouts shorter" or "skip exercises that bother my knee" — I'll remember going forward.**\n\nWhat can I help you with today?`;
      return Response.json({ reply, planUpdated: false });
    }

    const memoryBlock = profile?.coach_memory
      ? `\n\nCOACH MEMORY (persistent preferences this user has stated in previous sessions — always honor these):\n${profile.coach_memory}`
      : '';

    const contextBlock = `
USER PROFILE:
- Name: ${profile?.display_name || 'Unknown'}
- Age: ${profile?.age || 'Unknown'}, Sex: ${profile?.sex || 'Unknown'}, Weight: ${profile?.weight_lbs ? profile.weight_lbs + ' lbs' : 'Unknown'}
- Activity level: ${profile?.activity_level || 'Unknown'}, Fitness mode: ${profile?.fitness_mode || 'Standard'}
- Conditions/disabilities: ${(profile?.disabilities || []).join(', ') || 'None reported'}
- Body limitations and injuries: ${(profile?.body_limitations || []).join(' | ') || 'None reported'}
- Goals: ${(profile?.goals || []).join(', ') || 'Not set'}
- Equipment: ${(profile?.equipment || []).join(', ') || 'Bodyweight only'}
${memoryBlock}

CURRENT WORKOUT PLAN:
${workoutPlan ? `- Title: ${workoutPlan.title}
- Date: ${workoutPlan.date}
- Difficulty: ${workoutPlan.difficulty_level}
- Duration: ${workoutPlan.total_duration_minutes} minutes
- Safety notes: ${workoutPlan.safety_notes || 'None'}` : 'No active workout plan found.'}`;

    const notifyTool = {
      type: "function",
      function: {
        name: "notify_developer",
        description: "Notify the developer when the user asks for something out of scope, or is giving feedback/complaints. Always call this silently — never tell the user about it for feedback, only for out-of-scope requests.",
        parameters: {
          type: "object",
          required: ["message", "category"],
          properties: {
            message: { type: "string", description: "What the user said or asked for" },
            category: { type: "string", enum: ["out_of_scope", "feedback"], description: "out_of_scope if the user asked for something the app can't do; feedback if they are venting or complaining" }
          }
        }
      }
    };

    const tools = workoutPlan ? [
      {
        type: "function",
        function: {
          name: "update_workout_plan",
          description: "Update the user's current workout plan based on their feedback. Call this when the user wants to modify exercises, difficulty, or duration.",
          parameters: {
            type: "object",
            properties: {
              exercises: {
                type: "array",
                items: { type: "string" },
                description: "Updated list of exercise strings"
              },
              difficulty_level: {
                type: "string",
                enum: ["Gentle", "Easy", "Moderate", "Challenging"],
                description: "New difficulty level if changing"
              },
              total_duration_minutes: {
                type: "number",
                description: "New total duration in minutes if changing"
              },
              safety_notes: {
                type: "string",
                description: "Updated safety notes"
              }
            }
          }
        }
      },
      notifyTool
    ] : [notifyTool];

    const systemWithContext = SYSTEM_PROMPT + "\n\n" + contextBlock;

    const chatMessages = [
      { role: "system", content: systemWithContext },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_tokens: 600
    });

    const choice = response.choices[0];
    let reply = choice.message.content || "";
    let planUpdated = false;

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === "update_workout_plan" && workoutPlan) {
          await base44.asServiceRole.entities.WorkoutPlan.update(workoutPlan.id, args);
          planUpdated = true;

          const followUp = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              ...chatMessages,
              choice.message,
              { role: "tool", tool_call_id: toolCall.id, content: "Plan updated successfully." }
            ],
            max_tokens: 300
          });
          reply = followUp.choices[0].message.content || "Done! I've updated your workout plan.";

        } else if (toolCall.function.name === "notify_developer") {
          // Fire and forget — send email, don't block the response
          base44.asServiceRole.integrations.Core.SendEmail({
            to: "juliheaton@msn.com",
            subject: `FitAbility Coach: ${args.category === "out_of_scope" ? "Feature Request / Out-of-Scope Ask" : "User Feedback"} from ${user.full_name || user.email}`,
            body: `A user interaction requires your attention.\n\nUser: ${user.full_name || "Unknown"} (${user.email})\nCategory: ${args.category}\n\nMessage:\n${args.message}\n\n---\nSent automatically by the FitAbility Coach.`
          }).catch(() => {});

          // If out_of_scope, get a natural reply acknowledging it
          if (args.category === "out_of_scope" && !reply) {
            const followUp = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                ...chatMessages,
                choice.message,
                { role: "tool", tool_call_id: toolCall.id, content: "Developer notified." }
              ],
              max_tokens: 150
            });
            reply = followUp.choices[0].message.content || "That's a little beyond what I can do right now — but I've sent a quick note to my developer and they'll look into it!";
          }
        }
      }
    }

    // After each conversation, update coach memory with any new persistent preferences
    let updatedMemory = profile?.coach_memory || '';
    if (messages && messages.length >= 2) {
      const memoryUpdate = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extract any new persistent user preferences or constraints from this conversation that should be remembered for future workouts. Examples: 'prefers shorter workouts', 'shoulder exercises bother them', 'wants more stretching'. If nothing new, return the existing memory unchanged. Return only the memory string, no explanation. Keep it under 300 characters." },
          { role: "user", content: `Existing memory: ${updatedMemory || 'none'}\n\nNew conversation:\n${messages.map(m => m.role + ': ' + m.content).join('\n')}\nAssistant: ${reply}` }
        ],
        max_tokens: 150
      });
      updatedMemory = memoryUpdate.choices[0].message.content?.trim() || updatedMemory;
    }

    return Response.json({ reply, planUpdated, updatedMemory });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});