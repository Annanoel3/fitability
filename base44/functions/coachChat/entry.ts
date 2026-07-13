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
- Listen to user feedback about what worked, what didn't, what felt too easy or too hard
- Answer questions about exercises and form
- Provide encouragement and motivation
- Remember preferences and pain points in coach_memory so they shape future workout generation
- Do NOT show specific exercise modifications or claim to update the current/next workout with exact exercises

Always prioritize safety. Never recommend exercises that could aggravate the user's conditions.
Be warm, encouraging, and concise. Keep responses short and practical.

CRITICAL TONE: When the user mentions their workout was too hard, too easy, or had issues:
- Do NOT list specific exercises you'll put in the next workout — each day is freshly generated
- Do NOT say "Here's your updated workout with these changes" with a specific list
- DO acknowledge what they're telling you: "That was too easy, got it" or "Your knee bothered you during that move, I understand"
- DO say you'll remember it for next time and it will shape how their workouts are built going forward
- Keep it simple and conversational, not a technical adjustment
- Encourage them to try the next workout and come back with how it feels

When the user gives feedback about their workout or asks for adjustments:
- IMPORTANT: Each day's workout is freshly generated, so do NOT promise specific exercises in the next workout
- Instead, acknowledge their feedback and explain you'll remember it for future generations
- Use language like: "Got it — I'll remember that for next time" or "I hear you, that's important info"
- If they say an exercise was too hard, too easy, painful, or didn't work — validate and say you'll factor that in
- DO NOT call update_workout_plan or show a specific list of exercises
- Encourage them to come back after their next workout to let you know how it feels
- Keep it conversational and supportive, not technical

═══ PAIN REPORTING — ALWAYS GET SEVERITY ═══
When a user reports pain or a body issue:
1. If they did NOT include a severity number (0–10), ASK first: "How bad is the pain on a scale of 0 to 10?"
2. Once you have a severity number, call the record_pain tool with the body_zone, severity, and a short description.
3. Then acknowledge warmly and say you'll factor it into future workouts.

Map the user's words to the closest body_zone value (e.g. "lower back" → lower_back, "left knee" → left_knee). If they mention a bilateral area without specifying a side (e.g. "shoulders"), call record_pain for both left and right.
If the pain is already in their profile and the severity hasn't changed, just acknowledge it — don't call record_pain again.
NEVER diagnose or give medical advice. Just record and adjust.

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

     // Check if user just sent "Sounds good!" (onboarding tour acknowledgment)
     const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1]?.content?.toLowerCase() : '';
     const isSoundsGoodMessage = lastUserMessage.includes('sounds good');

     // Fetch user profile and relevant workout plan using service role
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by_id: user.id });
    const profile = profiles[0] || null;

    let workoutPlan = null;
    if (workoutPlanId) {
      const plans = await base44.asServiceRole.entities.WorkoutPlan.filter({ id: workoutPlanId, created_by_id: user.id });
      workoutPlan = plans[0] || null;
    } else {
      // Get the most recent workout (today preferred, then recent past)
      const plans = await base44.asServiceRole.entities.WorkoutPlan.filter({ created_by_id: user.id }, '-date', 5);
      workoutPlan = plans[0] || null;
    }

    // Handle welcome message for first coach visit
    if (isWelcome) {
      const name = profile?.display_name || profileName || 'there';
      const conditions = (profile?.disabilities || []).join(', ') || 'none reported';
      const goals = (profile?.goals || []).join(', ') || 'general fitness';
      const reply = `Hi ${name}! 👋 I'm your FitAbility Coach. I can help you adjust and fine-tune your workouts, suggest modifications for exercises, answer fitness questions, and keep you moving safely.\n\nPlus, keep me updated on any changes to your health and conditions—whether things are improving, getting tougher, or anything else that affects your workouts. The better I understand you, the better I can support your fitness journey. I'll remember everything you tell me and personalize your plan accordingly.`;
      return Response.json({ reply, planUpdated: false });
    }

    const memoryBlock = profile?.coach_memory
      ? `\n\nCOACH MEMORY (persistent preferences this user has stated in previous sessions — always honor these):\n${profile.coach_memory}`
      : '';

    const riskBlock = (profile?.risk_factor_details && Object.keys(profile.risk_factor_details).length) ? ("\n\nHEALTH CONDITIONS THIS USER FLAGGED (with how much each affects them):" + Object.entries(profile.risk_factor_details).map(function(e){ var k=e[0]; var d:any = e[1] || {}; return "\n- " + k + ": " + (d.severity || "severity not specified") + (d.note ? (" (their note: '" + d.note + "')") : ""); }).join("") + "\nFactor this in when they ask you to adjust. You can reassure them and remember preferences, but never tell them to do something their flagged conditions make unsafe.") : "";

    const contextBlock = `
USER PROFILE:
- Name: ${profile?.display_name || 'Unknown'}
- Age: ${profile?.age || 'Unknown'}, Sex: ${profile?.sex || 'Unknown'}, Weight: ${profile?.weight_lbs ? profile.weight_lbs + ' lbs' : 'Unknown'}
- Activity level: ${profile?.activity_level || 'Unknown'}, Fitness mode: ${profile?.fitness_mode || 'Standard'}
- Conditions/disabilities: ${(profile?.disabilities || []).join(', ') || 'None reported'}
- Body limitations and injuries: ${(profile?.body_limitations || []).join(' | ') || 'None reported'}
- Pain areas (already recorded with severity): ${Object.entries(profile?.pain_areas || {}).map(([area, level]) => `${area}: ${level}/10`).join(', ') || 'None reported'}
- Goals: ${(profile?.goals || []).join(', ') || 'Not set'}
- Equipment: ${(profile?.equipment || []).join(', ') || 'Bodyweight only'}
${memoryBlock}${riskBlock}

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

    const recordPainTool = {
      type: "function",
      function: {
        name: "record_pain",
        description: "Record a pain area reported by the user. Saves it to their structured profile so future workouts avoid aggravating that area. Call this ONLY after the user provides or confirms a severity rating (0-10). Map their words to the closest body_zone.",
        parameters: {
          type: "object",
          required: ["body_zone", "severity"],
          properties: {
            body_zone: {
              type: "string",
              enum: ["head", "neck", "left_shoulder", "right_shoulder", "chest", "upper_back", "abdomen", "lower_back", "left_arm", "right_arm", "left_forearm", "right_forearm", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_thigh", "right_thigh", "left_knee", "right_knee", "left_calf", "right_calf", "left_foot", "right_foot"],
              description: "The body zone where the user reports pain"
            },
            severity: { type: "number", minimum: 0, maximum: 10, description: "Pain severity 0-10 as rated by the user" },
            description: { type: "string", description: "Short description of the pain in the user's words" }
          }
        }
      }
    };

    const tools = [notifyTool, recordPainTool];

    const systemWithContext = SYSTEM_PROMPT + "\n\n" + contextBlock;

    // For "Sounds good!" message, return a simple acknowledgment without questions
    if (isSoundsGoodMessage) {
      return Response.json({ 
        reply: "Perfect! Keep me in the loop with how you're doing. Whether your conditions are improving, getting tougher, or anything changes that affects your workouts—just let me know and we'll adjust your plan. You've got this! 💪",
        planUpdated: false 
      });
    }

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

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults = [];
      let hadOutOfScope = false;

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === "notify_developer") {
          // Fire and forget — send email, don't block the response
          base44.asServiceRole.integrations.Core.SendEmail({
            to: "juliheaton@msn.com",
            subject: `FitAbility Coach: ${args.category === "out_of_scope" ? "Feature Request / Out-of-Scope Ask" : "User Feedback"} from ${user.full_name || user.email}`,
            body: `A user interaction requires your attention.\n\nUser: ${user.full_name || "Unknown"} (${user.email})\nCategory: ${args.category}\n\nMessage:\n${args.message}\n\n---\nSent automatically by the FitAbility Coach.`
          }).catch(() => {});
          if (args.category === "out_of_scope") hadOutOfScope = true;
          toolResults.push({ tool_call_id: toolCall.id, content: "Developer notified." });
        }

        if (toolCall.function.name === "record_pain" && profile) {
          const zone = args.body_zone;
          const severity = Math.max(0, Math.min(10, Number(args.severity) || 5));
          const desc = args.description || zone.replace(/_/g, ' ') + ' pain';

          const newPainAreas = { ...(profile.pain_areas || {}), [zone]: severity };
          const newMarkedZones = Array.from(new Set([...(profile.marked_zones || []), zone]));
          const newZoneDescs = { ...(profile.zone_descriptions || {}), [zone]: desc };

          // Update body_limitations — replace existing entry for same zone or add new
          const limitations = [...(profile.body_limitations || [])];
          const zoneLabel = zone.replace(/_/g, ' ');
          const existingIdx = limitations.findIndex(l => l.toLowerCase().includes(zoneLabel) || l.toLowerCase().includes(zone));
          const limitationStr = `${zoneLabel}: ${desc} (pain ${severity}/10)`;
          if (existingIdx >= 0) limitations[existingIdx] = limitationStr;
          else limitations.push(limitationStr);

          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            pain_areas: newPainAreas,
            marked_zones: newMarkedZones,
            zone_descriptions: newZoneDescs,
            body_limitations: limitations
          });

          // Recalculate restriction tags so safety filtering picks up the new pain
          try { await base44.functions.invoke('computeUserTags', { profile_id: profile.id }); } catch (e) {}

          // Update local profile reference for subsequent tool calls
          profile.pain_areas = newPainAreas;
          profile.marked_zones = newMarkedZones;
          profile.zone_descriptions = newZoneDescs;
          profile.body_limitations = limitations;

          toolResults.push({ tool_call_id: toolCall.id, content: `Pain recorded: ${zoneLabel} at ${severity}/10. Profile updated.` });
        }
      }

      // If no text reply was generated alongside tool calls, get a natural response
      if (!reply && toolResults.length > 0) {
        const followUp = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...chatMessages,
            choice.message,
            ...toolResults.map(r => ({ role: "tool", tool_call_id: r.tool_call_id, content: r.content }))
          ],
          max_tokens: 250
        });
        reply = followUp.choices[0].message.content || "";
      }

      if (hadOutOfScope && !reply) {
        reply = "That's a little beyond what I can do right now — but I've sent a quick note to my developer and they'll look into it!";
      }
    }

    // After each conversation, update coach memory with any new persistent preferences
    let updatedMemory = profile?.coach_memory || '';
    if (messages && messages.length >= 1) {
      const memoryUpdate = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Extract ANY persistent information from this conversation that should affect future workout generation or user profile. This includes:
- Difficulty or intensity feedback (workouts too easy/hard, need more/less challenge)
- Changes to pain, symptoms, or condition status (new pain, pain improving, flare-ups, etc.)
- Changes to mobility, energy, or physical capabilities
- Workout preferences (duration, exercise types, equipment)
- Limitations or restrictions the user reports or reports improving
- Anything the user says about their body, health, or how exercises make them feel
- Any other feedback that would shape how we build their next workout

ALWAYS preserve existing memory and add new information. If something contradicts old memory, update it.
Return only the updated memory string, concise and actionable. Keep under 400 characters.` },
          { role: "user", content: `Existing memory:\n${updatedMemory || '(none)'}\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nAssistant reply: ${reply}` }
        ],
        max_tokens: 200
      });
      updatedMemory = memoryUpdate.choices[0].message.content?.trim() || updatedMemory;
    }

    return Response.json({ reply, updatedMemory });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});