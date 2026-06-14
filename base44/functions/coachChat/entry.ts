import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const SYSTEM_PROMPT = `You are FitAbility Coach, a compassionate and expert adaptive fitness assistant. 
Your job is to help users who have disabilities, chronic pain, or physical limitations get the most out of their workout plans safely.

You can:
- Adjust workout plans based on user feedback (too hard, too easy, specific exercises causing pain, etc.)
- Suggest exercise modifications
- Answer questions about exercises and form
- Provide encouragement and motivation
- When the user asks to modify their workout plan, you MUST call the update_workout_plan function

Always prioritize safety. Never recommend exercises that could aggravate the user's conditions.
Be warm, encouraging, and concise. Keep responses short and practical.

When updating a workout plan:
- Preserve the overall structure but modify specific exercises as requested
- Always explain what you changed and why
- Confirm the change was saved`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages, workoutPlanId } = await req.json();

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

    const contextBlock = `
USER PROFILE:
- Name: ${profile?.display_name || 'Unknown'}
- Age: ${profile?.age || 'Unknown'}, Activity level: ${profile?.activity_level || 'Unknown'}
- Fitness mode: ${profile?.fitness_mode || 'Standard'}
- Conditions/disabilities: ${(profile?.disabilities || []).join(', ') || 'None reported'}
- Body limitations: ${(profile?.body_limitations || []).join(', ') || 'None reported'}
- Goals: ${(profile?.goals || []).join(', ') || 'Not set'}

CURRENT WORKOUT PLAN:
${workoutPlan ? `- Title: ${workoutPlan.title}
- Date: ${workoutPlan.date}
- Difficulty: ${workoutPlan.difficulty_level}
- Duration: ${workoutPlan.total_duration_minutes} minutes
- Exercises: ${(workoutPlan.exercises || []).join(' | ')}
- Safety notes: ${workoutPlan.safety_notes || 'None'}` : 'No active workout plan found.'}`;

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
      }
    ] : [];

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

    // Handle tool call — update the workout plan
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "update_workout_plan" && workoutPlan) {
        const updates = JSON.parse(toolCall.function.arguments);
        await base44.asServiceRole.entities.WorkoutPlan.update(workoutPlan.id, updates);
        planUpdated = true;

        // Get a natural language follow-up from the model
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
      }
    }

    return Response.json({ reply, planUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});