import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Get untagged exercises
    const all = await base44.asServiceRole.entities.Exercise.list('-created_date', 500);
    const untagged = all.filter(e => !e.restriction_tags || e.restriction_tags.length === 0);

    if (untagged.length === 0) {
      return Response.json({ success: true, message: 'All exercises already tagged', done: true });
    }

    const batch = untagged.slice(offset, offset + BATCH);
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

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert adaptive physical therapist. For each exercise below, assign accurate restriction_tags, suitable_for_tags, and equipment_tags based on the exercise name, category, position, and description.

EXERCISES TO TAG:
${exerciseList}

RESTRICTION_TAGS — use ONLY these exact strings. Tag an exercise if the condition CONTRAINDICATES it (i.e., someone with this condition should NOT do this exercise):

MOBILITY: cannot_stand, wheelchair_user, no_legs, single_leg_amputation, no_arms, single_arm_amputation, no_bilateral_arms, paraplegia, very_low_mobility, bedridden
JOINTS: knee_pain, knee_replacement, hip_pain, hip_replacement, back_pain, neck_injury, shoulder_injury, wrist_injury, elbow_injury, ankle_pain
MOVEMENT RESTRICTIONS: no_high_impact, no_spinal_flexion, no_overhead_press, no_neck_flexion, no_head_inversion, balance_issues
CARDIAC/PULMONARY: heart_condition, copd, breathing_difficulty
BONE/STRUCTURAL: osteoporosis, fracture_risk, scoliosis
NEUROLOGICAL: multiple_sclerosis, parkinsons, cerebral_palsy, seizure_risk, vertigo
SYSTEMIC: fibromyalgia, chronic_fatigue, arthritis, rheumatoid_arthritis, high_bmi, pregnancy, heat_sensitive, immune_compromised

CRITICAL LOGIC:
- If position = "Standing" but person cannot_stand, tag it. If position = "Wheelchair" but person is NOT wheelchair_user, EXCLUDE this exercise (don't show it). If position = "Seated", it's usually safe for wheelchair users.
- If exercise requires high-impact movements (jumping, running, heavy impact), tag no_high_impact.
- If exercise requires core stability or trunk control, tag paraplegia and very_low_mobility.
- If exercise mentions pain-provoking movements for a joint (e.g., deep squats → knee_pain), tag it.

SUITABLE_FOR_TAGS — conditions this exercise is especially good for. Only tag if the exercise actively helps:
wheelchair_user, seated_only, low_mobility, very_low_mobility, chronic_pain, heart_safe, vertigo_safe, osteoporosis_safe, balance_training, fall_prevention, stroke_recovery, coordination, sensory_grounding, fatigue_management, breathing_focused, joint_mobility, upper_body_focus, lower_body_focus, core_stability

EQUIPMENT_TAGS: exact equipment needed. Use ONLY: chair, mat, resistance_bands, dumbbells, wall, pillow, towel. Empty array = pure bodyweight (no equipment needed).

Return a JSON array with one object per exercise (in same order), each with fields: name, restriction_tags (array), suitable_for_tags (array), equipment_tags (array).`,
      response_json_schema: {
        type: 'object',
        properties: {
          tagged: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                restriction_tags: { type: 'array', items: { type: 'string' } },
                suitable_for_tags: { type: 'array', items: { type: 'string' } },
                equipment_tags: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      model: 'gpt_5_4'
    });

    console.log('Tagged result sample:', JSON.stringify(result?.tagged?.slice(0, 2)));
    let updated = 0;
    const tagged = result.tagged || [];
    for (let i = 0; i < batch.length; i++) {
      const tags = tagged[i];
      if (!tags) { console.log(`No tags for index ${i}`); continue; }
      try {
        await base44.asServiceRole.entities.Exercise.update(batch[i].id, {
          restriction_tags: tags.restriction_tags || [],
          suitable_for_tags: tags.suitable_for_tags || [],
          equipment_tags: tags.equipment_tags || []
        });
        updated++;
      } catch (e) {
        console.log(`Failed to update ${batch[i].name}: ${e.message}`);
      }
    }

    const remaining = untagged.length - offset - batch.length;
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