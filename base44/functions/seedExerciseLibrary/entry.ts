import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

// Focused ability groups — each batch call targets one group so we never timeout
const ABILITY_GROUPS = [
  {
    label: "Wheelchair & No Legs",
    conditions: "wheelchair users, people with no legs, lower limb amputees, paraplegics",
    positions: "Wheelchair, Seated",
    restriction_examples: "cannot_stand, no_legs, wheelchair_user, paraplegia",
    suitable_examples: "wheelchair_user, seated_only, upper_body_only"
  },
  {
    label: "Knee, Hip & Lower Body Pain",
    conditions: "severe knee pain, knee replacement, hip pain, hip replacement, ankle injuries, ankle fusion",
    positions: "Standing, Seated, Any",
    restriction_examples: "knee_pain, knee_replacement, hip_pain, ankle_pain, no_high_impact",
    suitable_examples: "low_mobility, chronic_pain, joint_friendly"
  },
  {
    label: "Back, Neck & Spine",
    conditions: "chronic lower back pain, herniated disc, scoliosis, neck injury, cervical fusion",
    positions: "Standing, Lying down, Any",
    restriction_examples: "back_pain, scoliosis, neck_injury, no_spinal_flexion, no_overhead_press",
    suitable_examples: "core_stability, chronic_pain, posture_support"
  },
  {
    label: "Upper Body Injuries",
    conditions: "shoulder injury, rotator cuff, wrist arthritis, hand injuries, elbow injury, no arms or single arm",
    positions: "Standing, Seated, Any",
    restriction_examples: "shoulder_injury, wrist_injury, elbow_injury, no_overhead_press, cannot_bear_weight_on_hands",
    suitable_examples: "lower_body_only, grip_strength, coordination"
  },
  {
    label: "Heart, Lungs & Low Intensity",
    conditions: "heart conditions, cardiac rehab patients, COPD, severe respiratory issues, cancer recovery, immune compromised",
    positions: "Seated, Standing, Any",
    restriction_examples: "heart_condition, copd, immune_compromised, low_intensity_only",
    suitable_examples: "heart_safe, cardiac_rehab, pulmonary_rehab, breathing_focused, fatigue_management"
  },
  {
    label: "Neurological Conditions",
    conditions: "Parkinson's disease, multiple sclerosis, stroke recovery, cerebral palsy, epilepsy, vertigo, vestibular disorders",
    positions: "Seated, Standing, Any",
    restriction_examples: "parkinsons, multiple_sclerosis, stroke_recovery, vertigo, balance_issues, heat_sensitive",
    suitable_examples: "neurological_rehab, balance_training, fall_prevention, vertigo_safe, proprioception"
  },
  {
    label: "Chronic Pain & Fatigue",
    conditions: "fibromyalgia, chronic fatigue syndrome, rheumatoid arthritis, general arthritis, lupus, pain flares",
    positions: "Seated, Lying down, Any",
    restriction_examples: "fibromyalgia, chronic_fatigue, rheumatoid_arthritis, pain_flares, arthritis",
    suitable_examples: "pain_management, fatigue_management, gentle_movement, low_intensity_only"
  },
  {
    label: "Mental Health & Neurodivergent",
    conditions: "autism spectrum, anxiety, PTSD, depression, sensory processing disorders",
    positions: "Any, Standing, Seated",
    restriction_examples: "anxiety, ptsd, sensory_sensitivity",
    suitable_examples: "autism, anxiety, sensory_grounding, trauma_sensitive, routine_based, depression"
  },
  {
    label: "Bone Density & Weight",
    conditions: "osteoporosis, brittle bones, obesity, very high BMI, pregnancy, postpartum recovery",
    positions: "Standing, Seated, Any",
    restriction_examples: "osteoporosis, fracture_risk, high_bmi, pregnancy, no_high_impact",
    suitable_examples: "osteoporosis_safe, pelvic_floor, postpartum, bone_density, low_load"
  },
  {
    label: "Elderly & Bedridden",
    conditions: "elderly frailty, bedridden patients, very low mobility, fall risk, general deconditioning",
    positions: "Lying down, Seated, Standing",
    restriction_examples: "elderly, frailty, bedridden, very_low_mobility, fall_risk",
    suitable_examples: "fall_prevention, balance_training, elderly, frailty, bed_exercises"
  },
  {
    label: "Standard — Full Range",
    conditions: "people with no significant limitations, standard fitness, general population",
    positions: "Standing, Any",
    restriction_examples: "none",
    suitable_examples: "standard, general_fitness, no_restrictions"
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { group_index = 0 } = await req.json().catch(() => ({}));

    if (group_index >= ABILITY_GROUPS.length) {
      return Response.json({ success: true, message: 'All groups seeded', done: true });
    }

    const group = ABILITY_GROUPS[group_index];

    // Get existing names to avoid duplicates
    const existing = await base44.asServiceRole.entities.Exercise.list('-created_date', 500);
    const existingNames = new Set(existing.map(e => e.name.toLowerCase().trim()));

    const prompt = `You are an expert adaptive physical therapist building a comprehensive exercise library for ALL abilities.

CURRENT TASK: Generate 10 unique exercises specifically designed for: ${group.label}
Target conditions: ${group.conditions}

═══ RULES ═══
1. All 10 exercises must be safe and appropriate for the stated conditions.
2. Include a MIX of: bodyweight-only AND chair-assisted AND mat-based exercises.
3. Include variety across categories: Warmup, Strength, Cardio, Balance, Flexibility, Cooldown, Breathing, Recovery.
4. Positions should be realistic: ${group.positions}.
5. Difficulties: mix of Beginner, Easy, Moderate.
6. safety_rating: only "Safe" or "Caution" — never "Avoid".
7. DO NOT repeat these existing exercises: ${Array.from(existingNames).slice(0, 80).join(', ') || 'none'}.
8. Be specific and descriptive with names (e.g. "Seated Shoulder Roll for Wheelchair Users" not just "Shoulder Roll").
9. Include detailed step-by-step instructions and practical modifications.

═══ TAGGING RULES ═══
restriction_tags: List ALL conditions that would make this exercise UNSAFE or CONTRAINDICATED.
  Use tags like: ${group.restriction_examples}, knee_pain, back_pain, heart_condition, vertigo, etc.
  
suitable_for_tags: List conditions this exercise is ESPECIALLY BENEFICIAL for.
  Use tags like: ${group.suitable_examples}, chronic_pain, elderly, balance_training, etc.

equipment_tags: EXACT equipment required. Empty array = pure bodyweight. Options: chair, mat, resistance_bands, dumbbells, wall, pillow, towel.

Return exactly 10 exercises.`;

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const rawResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt + "\n\nReturn a JSON object: { \"exercises\": [...] }" }],
      response_format: { type: "json_object" },
      max_tokens: 4000
    });
    const result = JSON.parse(rawResponse.choices[0].message.content || "{}");

    const exercises = (result.exercises || []).filter(ex =>
      ex.safety_rating !== 'Avoid' && !existingNames.has(ex.name.toLowerCase().trim())
    );

    let created = 0;
    for (const ex of exercises) {
      await base44.asServiceRole.entities.Exercise.create({
        name: ex.name,
        description: ex.description,
        instructions: ex.instructions,
        category: ex.category,
        position: ex.position,
        difficulty: ex.difficulty,
        muscles_used: ex.muscles_used || [],
        equipment_tags: ex.equipment_tags || [],
        restriction_tags: ex.restriction_tags || [],
        suitable_for_tags: ex.suitable_for_tags || [],
        modifications: ex.modifications,
        safety_rating: ex.safety_rating || 'Safe',
        safety_notes: ex.safety_notes,
        default_sets: ex.default_sets,
        default_reps: ex.default_reps,
        default_duration_seconds: ex.default_duration_seconds,
        is_custom: false
      });
      created++;
    }

    return Response.json({
      success: true,
      group: group.label,
      group_index,
      created,
      next_group_index: group_index + 1,
      done: group_index + 1 >= ABILITY_GROUPS.length,
      total_groups: ABILITY_GROUPS.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});