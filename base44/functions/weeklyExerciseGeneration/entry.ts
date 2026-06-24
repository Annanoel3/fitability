import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all user profiles
    const profiles = await base44.asServiceRole.entities.UserProfile.list();
    const results = [];

    for (const profile of profiles) {
      try {
        // Count existing exercises for this user
        const existing = await base44.asServiceRole.entities.Exercise.filter({
          created_by_id: profile.created_by_id
        });

        const MIN_EXERCISES = 30;
        if (existing.length >= MIN_EXERCISES) {
          results.push({ user: profile.display_name, skipped: true, reason: `Already has ${existing.length} exercises` });
          continue;
        }

        const needCount = MIN_EXERCISES - existing.length;
        const existingNames = existing.map(e => e.name).join(', ');

        // Build strict safety context from profile
        const limitations = (profile.body_limitations || []).join(', ') || 'None';
        const disabilities = (profile.disabilities || []).join(', ') || 'None';
        const painAreas = Object.entries(profile.pain_areas || {})
          .map(([area, level]) => `${area} (${level}/10)`).join(', ') || 'None';
        const equipment = (profile.equipment || []).join(', ') || 'NONE — bodyweight only';
        const abilities = Object.entries(profile.current_abilities || {})
          .filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' ')).join(', ') || 'None';
        const fitnessMode = profile.fitness_mode || 'Standard';
        const activityLevel = profile.activity_level || 'Unknown';
        const riskFactors = (profile.risk_factors || []).join(', ') || 'None';

        const prompt = `You are an expert adaptive physical therapist generating safe, personalized exercises for a user with specific physical limitations.

═══ ABSOLUTE SAFETY RULES — NEVER VIOLATE ═══
1. EQUIPMENT: The user ONLY has: ${equipment}. If "NONE", every exercise must be 100% pure bodyweight — no props, no weights, no bands. Listing any exercise that requires unlisted equipment is a critical error.
2. LIMITATIONS: These are HARD CONSTRAINTS — no exercise may involve or stress these areas:
   Body limitations: ${limitations}
   Cannot do: ${abilities}
3. DISABILITIES: Design around these conditions — never aggravate them:
   ${disabilities}
4. PAIN AREAS: Avoid loading or stressing these areas:
   ${painAreas}
5. RISK FACTORS: Extra caution required: ${riskFactors}
6. FITNESS MODE: ${fitnessMode} — ${fitnessMode === 'Wheelchair' ? 'ALL exercises must be performable in a wheelchair.' : fitnessMode === 'Chair' ? 'All exercises should be chair-based or supported.' : fitnessMode === 'Recovery' ? 'Extremely gentle movements only, recovery-focused.' : 'Standard adaptive approach.'}
7. ACTIVITY LEVEL: ${activityLevel} — match exercise intensity to this level.
8. UNIQUENESS: Do NOT generate any of these already-existing exercises: ${existingNames || 'none yet'}.
9. VARIETY: Include a healthy mix of categories: Warmup, Strength, Cardio, Flexibility, Balance, Breathing, Cooldown.
10. SAFETY RATING: Assign each exercise one of: Safe, Caution, Avoid — only include Safe or Caution ones.

Generate exactly ${needCount} NEW adaptive exercises this user can safely perform given all constraints above.
For each exercise: name, description, step-by-step instructions, category, position, difficulty, muscles_used, equipment_needed, modifications, safety_rating, safety_notes, default_sets, default_reps or default_duration_seconds.

Verify EVERY exercise against ALL constraints before including it. If unsure → remove it.`;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    instructions: { type: 'string' },
                    category: { type: 'string' },
                    position: { type: 'string' },
                    difficulty: { type: 'string' },
                    muscles_used: { type: 'array', items: { type: 'string' } },
                    equipment_needed: { type: 'array', items: { type: 'string' } },
                    modifications: { type: 'string' },
                    safety_rating: { type: 'string' },
                    safety_notes: { type: 'string' },
                    default_sets: { type: 'number' },
                    default_reps: { type: 'number' },
                    default_duration_seconds: { type: 'number' }
                  }
                }
              }
            }
          },
          model: 'claude_sonnet_4_6'
        });

        const exercises = result.exercises || [];

        // Final safety filter: drop any exercise marked Avoid
        const safeExercises = exercises.filter(ex => ex.safety_rating !== 'Avoid');

        // Bulk create under the user's account using service role
        for (const ex of safeExercises) {
          await base44.asServiceRole.entities.Exercise.create({
            ...ex,
            is_custom: false,
            created_by_id: profile.created_by_id
          });
        }

        results.push({
          user: profile.display_name,
          generated: safeExercises.length,
          dropped: exercises.length - safeExercises.length,
          totalNow: existing.length + safeExercises.length
        });

      } catch (e) {
        results.push({ user: profile.display_name, error: e.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});