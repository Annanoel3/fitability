import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

// Tags existing exercises that have no restriction_tags yet — processes in batches of 20
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { offset = 0 } = await req.json().catch(() => ({}));
    const BATCH = 10;

    // Get all exercises (re-tag to include left/right specificity)
    const all = (await base44.asServiceRole.entities.Exercise.list('-created_date', 500)).filter(e => !(e.restriction_tags || []).length);

    if (all.length === 0) {
      return Response.json({ success: true, message: 'No exercises to tag', done: true });
    }

    const batch = all.slice(offset, offset + BATCH);
    if (batch.length === 0) {
      return Response.json({ success: true, message: 'No more to tag', done: true });
    }

    const exerciseList = batch.map((ex, i) =>
      `${i + 1}. Name: "${ex.name}"
   Category: ${ex.category || '?'} | Position: ${ex.position || '?'} | Difficulty: ${ex.difficulty || '?'}
   Description: ${ex.description || 'N/A'}
   Instructions: ${ex.instructions || 'N/A'}
   Muscles: ${(ex.muscles_used || []).join(', ') || 'N/A'}`
    ).join('\n\n');

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const raw = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 3000,
      messages: [{ role: "user", content: `You are an expert adaptive physical therapist. For each exercise below, assign accurate restriction_tags, suitable_for_tags, and equipment_tags.

EXERCISES TO TAG:
${exerciseList}

RESTRICTION_TAGS (conditions that CONTRAINDICATE the exercise): cannot_stand, wheelchair_user, no_legs, single_leg_amputation, no_arms, paraplegia, very_low_mobility, bedridden, knee_pain, knee_replacement, hip_pain, hip_replacement, back_pain, neck_injury, shoulder_injury, wrist_injury, elbow_injury, ankle_pain, no_high_impact, no_spinal_flexion, no_overhead_press, no_neck_flexion, no_head_inversion, balance_issues, heart_condition, copd, breathing_difficulty, osteoporosis, fracture_risk, scoliosis, multiple_sclerosis, parkinsons, cerebral_palsy, seizure_risk, vertigo, fibromyalgia, chronic_fatigue, arthritis, rheumatoid_arthritis, high_bmi, pregnancy, heat_sensitive, immune_compromised

SUITABLE_FOR_TAGS (conditions this exercise helps): wheelchair_user, seated_only, low_mobility, chronic_pain, heart_safe, vertigo_safe, osteoporosis_safe, balance_training, fall_prevention, stroke_recovery, coordination, sensory_grounding, fatigue_management, breathing_focused, joint_mobility, upper_body_focus, lower_body_focus, core_stability

EQUIPMENT_TAGS (use ONLY): chair, mat, resistance_bands, dumbbells, wall, pillow, towel. Empty array = bodyweight only.

Return JSON: { "tagged": [ { "name": string, "restriction_tags": [], "suitable_for_tags": [], "equipment_tags": [] } ] }` }]
    });

    const result = JSON.parse(raw.choices[0].message.content || "{}");

    console.log('Tagged result sample:', JSON.stringify(result?.tagged?.slice(0, 2)));
    let updated = 0;
    const tagged = result.tagged || [];
    for (let i = 0; i < batch.length; i++) {
      const tags = tagged[i];
      if (!tags) { console.log(`No tags for index ${i}`); continue; }
      try {
        await base44.asServiceRole.entities.Exercise.update(batch[i].id, {
          restriction_tags: tags.restriction_tags || []
        });
        updated++;
      } catch (e) {
        console.log(`Failed to update ${batch[i].name}: ${e.message}`);
      }
    }

    const remaining = all.length - offset - batch.length;
    return Response.json({
      success: true,
      updated,
      offset,
      next_offset: offset + BATCH,
      remaining,
      done: remaining <= 0
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});