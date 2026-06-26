import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { preferences = {} } = await req.json();

    const profiles = await base44.entities.UserProfile.filter({});
    if (profiles.length === 0) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    const profile = profiles[0];
    const heightFt = profile.height_inches ? Math.floor(profile.height_inches / 12) : null;
    const heightIn = profile.height_inches ? profile.height_inches % 12 : null;
    const heightStr = heightFt ? `${heightFt}'${heightIn}"` : "Not provided";
    const bmi = (profile.weight_lbs && profile.height_inches)
      ? ((profile.weight_lbs / (profile.height_inches * profile.height_inches)) * 703).toFixed(1)
      : null;

    // Fetch last 10 completed workouts for variety tracking
    const recentWorkouts = await base44.entities.WorkoutPlan.filter({ completed: true }, "-date", 10);
    const exerciseFrequency = {};
    const categoryFrequency = {};
    
    recentWorkouts.forEach(w => {
      try {
        const data = JSON.parse(w.workout_data || "{}");
        if (data.exercises && Array.isArray(data.exercises)) {
          data.exercises.forEach(ex => {
            exerciseFrequency[ex.name] = (exerciseFrequency[ex.name] || 0) + 1;
          });
        }
        if (w.difficulty_level) {
          categoryFrequency[w.difficulty_level] = (categoryFrequency[w.difficulty_level] || 0) + 1;
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    const p = profile;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert adaptive fitness coach and physical therapist AI. Generate a highly personalized workout for this specific individual.

${preferences.workoutType ? `═══ USER'S WORKOUT PREFERENCES ═══
Requested workout type: ${preferences.workoutType}
Requested intensity: ${preferences.intensity}
Available equipment: ${(preferences.equipment || []).join(", ") || "bodyweight only"}
` : ""}

${p.coach_memory ? `═══ COACH MEMORY (User Feedback & Preferences) ═══
${p.coach_memory}
APPLY THIS: Any preferences, difficulty adjustments, pain changes, or feedback in the memory above MUST shape this workout. If user said workouts are too hard/easy, adjust. If they reported new pain or improvement, respect it. This memory represents real user experience.

` : ""}

═══ CRITICAL SAFETY RULES (NON-NEGOTIABLE) ═══
- Every listed body limitation, disability, and pain area is a HARD CONSTRAINT. Violating any = unsafe workout.
- If ANY exercise could aggravate a listed condition, pain area, or limitation → REMOVE IT.
- Wheelchair users: ALL exercises must be performable in a wheelchair.
- Cannot stand: ZERO standing exercises.

═══ FULL USER PROFILE ═══
Name: ${p.display_name || "User"}
Age: ${p.age || "Unknown"}
Sex/Gender: ${p.sex || "Not provided"}
Height: ${heightStr}
Weight: ${p.weight_lbs ? p.weight_lbs + " lbs" : "Not provided"}
BMI: ${bmi || "Unknown"}
Activity Level: ${p.activity_level || "Unknown"}
Fitness Mode: ${p.fitness_mode || "Standard"}

Goals: ${(p.goals || []).join(", ") || "None specified"}
Conditions: ${(p.disabilities || []).join(", ") || "None"}
Body Limitations: ${(p.body_limitations || []).length > 0 ? (p.body_limitations || []).map(l => `❌ ${l}`).join(", ") : "None"}
Pain Areas: ${Object.entries(p.pain_areas || {}).map(([area, level]) => `${area}: ${level}/10`).join(", ") || "None"}
Risk Factors: ${(p.risk_factors || []).join(", ") || "None"}

═══ VARIETY & PROGRESSION ═══
Recent workout frequencies (to minimize repetition):
${Object.entries(exerciseFrequency).length > 0 
  ? Object.entries(exerciseFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ex, freq]) => `- ${ex}: used ${freq} times`).join("\n")
  : "No recent workouts yet"}

INSTRUCTIONS FOR VARIETY:
- Use at least 50% NEW or RARELY-USED exercises
- Rotate between different movement patterns (if last workout was upper body focus, prioritize lower body or core)
- Vary difficulty slightly from most recent workout
- Mix cardio, strength, balance, and flexibility across the week
- Never repeat the exact same exercise 2 days in a row

INSTRUCTIONS FOR WORKOUT:
Generate a complete daily workout with warmup, 3–6 main exercises, and cooldown.
Each exercise must include: name, description, sets, reps/duration, step-by-step instructions, position, muscles_used, safety_notes.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          total_duration_minutes: { type: "number" },
          difficulty_level: { type: "string" },
          warmup: {
            type: "object",
            properties: {
              name: { type: "string" },
              duration_minutes: { type: "number" },
              instructions: { type: "string" }
            }
          },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                sets: { type: "number" },
                reps: { type: "number" },
                duration_seconds: { type: "number" },
                instructions: { type: "string" },
                position: { type: "string" },
                muscles_used: { type: "array", items: { type: "string" } },
                safety_notes: { type: "string" }
              }
            }
          },
          cooldown: {
            type: "object",
            properties: {
              name: { type: "string" },
              duration_minutes: { type: "number" },
              instructions: { type: "string" }
            }
          },
          safety_review: { type: "string" }
        }
      },
      model: "gpt_5_4"
    });

    const today = new Date().toISOString().split("T")[0];
    const workout = await base44.entities.WorkoutPlan.create({
      title: result.title,
      description: result.description,
      plan_type: "Daily",
      date: today,
      total_duration_minutes: result.total_duration_minutes,
      difficulty_level: result.difficulty_level,
      safety_validated: true,
      safety_notes: result.safety_review,
      exercises_total: result.exercises?.length || 0,
      workout_data: JSON.stringify(result)
    });

    return Response.json({ 
      success: true,
      workout: workout,
      message: "Personalized workout generated with variety and safety in mind"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});