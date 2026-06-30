import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

// The full spectrum of ability profiles we want to cover in the shared library.
// Each run picks a rotating subset so over time the library grows across ALL profiles.
const ABILITY_PROFILES = [
  { label: "No legs / lower limb amputation", tags: ["wheelchair_user", "no_legs", "cannot_stand", "upper_body_only"] },
  { label: "Single leg amputation", tags: ["single_leg_amputation", "balance_issues", "prosthetic_user"] },
  { label: "No arms / upper limb amputation", tags: ["no_arms", "lower_body_only", "cannot_use_hands"] },
  { label: "Wheelchair user — full time", tags: ["wheelchair_user", "cannot_stand", "seated_only"] },
  { label: "Wheelchair user — part time / transitional", tags: ["wheelchair_user", "limited_standing"] },
  { label: "Severe knee pain / knee replacement", tags: ["knee_pain", "knee_replacement", "no_impact"] },
  { label: "Severe hip pain / hip replacement", tags: ["hip_pain", "hip_replacement", "limited_hip_flexion"] },
  { label: "Chronic lower back pain / herniated disc", tags: ["back_pain", "herniated_disc", "no_spinal_flexion"] },
  { label: "Scoliosis", tags: ["scoliosis", "spinal_asymmetry", "back_pain"] },
  { label: "Severe ankle injury / ankle fusion", tags: ["ankle_pain", "ankle_fusion", "no_weight_bearing_ankle"] },
  { label: "Shoulder injury / rotator cuff", tags: ["shoulder_injury", "no_overhead_press", "rotator_cuff"] },
  { label: "Wrist / hand injury or arthritis", tags: ["wrist_injury", "wrist_arthritis", "cannot_bear_weight_on_hands"] },
  { label: "Elbow injury / tennis elbow", tags: ["elbow_injury", "tennis_elbow"] },
  { label: "Neck injury / cervical fusion", tags: ["neck_injury", "cervical_fusion", "no_neck_flexion"] },
  { label: "Heart condition / cardiac rehab", tags: ["heart_condition", "cardiac_rehab", "low_intensity_only", "heart_safe"] },
  { label: "COPD / severe respiratory condition", tags: ["copd", "breathing_difficulty", "low_intensity_only"] },
  { label: "Vertigo / vestibular disorder", tags: ["vertigo", "balance_issues", "no_head_inversion", "vertigo_safe"] },
  { label: "Multiple sclerosis", tags: ["multiple_sclerosis", "fatigue", "heat_sensitive", "balance_issues"] },
  { label: "Parkinson's disease", tags: ["parkinsons", "tremors", "balance_issues", "freezing_gait"] },
  { label: "Stroke recovery", tags: ["stroke_recovery", "hemiplegia", "one_sided_weakness", "speech_difficulty"] },
  { label: "Cerebral palsy", tags: ["cerebral_palsy", "spasticity", "coordination_difficulty"] },
  { label: "Spinal cord injury — paraplegia", tags: ["paraplegia", "cannot_stand", "seated_only", "wheelchair_user"] },
  { label: "Spinal cord injury — quadriplegia (partial function)", tags: ["quadriplegia", "limited_arm_function", "seated_only", "wheelchair_user"] },
  { label: "Fibromyalgia / chronic fatigue syndrome", tags: ["fibromyalgia", "chronic_fatigue", "pain_flares", "low_intensity_only"] },
  { label: "Osteoporosis / brittle bones", tags: ["osteoporosis", "fracture_risk", "no_high_impact", "osteoporosis_safe"] },
  { label: "Arthritis — general", tags: ["arthritis", "joint_pain", "morning_stiffness"] },
  { label: "Rheumatoid arthritis", tags: ["rheumatoid_arthritis", "joint_inflammation", "flare_sensitive"] },
  { label: "Autism spectrum / sensory processing", tags: ["autism", "sensory_sensitivity", "routine_based", "low_stimulation"] },
  { label: "Anxiety / PTSD", tags: ["anxiety", "ptsd", "trauma_sensitive", "grounding_focus"] },
  { label: "Depression / low motivation", tags: ["depression", "low_energy", "motivation_support"] },
  { label: "Obesity / very high BMI", tags: ["high_bmi", "joint_stress", "no_high_impact", "low_load"] },
  { label: "Pregnancy (general adaptive)", tags: ["pregnancy", "no_abdominal_pressure", "no_lying_on_back_third_trimester"] },
  { label: "Postpartum recovery", tags: ["postpartum", "pelvic_floor_recovery", "diastasis_recti_risk"] },
  { label: "Low vision / blind", tags: ["low_vision", "blind", "proprioception_focus", "no_visual_cues_required"] },
  { label: "Deaf / hard of hearing", tags: ["deaf", "hearing_impaired", "visual_cues_preferred"] },
  { label: "Elderly — general frailty", tags: ["elderly", "frailty", "fall_risk", "balance_issues", "low_intensity_only"] },
  { label: "Bedridden / very low mobility", tags: ["bedridden", "bed_exercises_only", "very_low_mobility"] },
  { label: "Cancer / chemotherapy recovery", tags: ["cancer_recovery", "chemo_fatigue", "immune_compromised", "low_intensity_only"] },
  { label: "Diabetes — exercise considerations", tags: ["diabetes", "neuropathy", "blood_sugar_monitoring"] },
  { label: "Standard — no limitations", tags: ["standard", "no_restrictions"] },
];

const EQUIPMENT_SCENARIOS = [
  [],
  ["chair"],
  ["mat"],
  ["chair", "mat"],
  ["resistance_bands"],
  ["dumbbells"],
  ["chair", "resistance_bands"],
  ["dumbbells", "mat"],
  ["wall"],
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count existing shared exercises
    const existing = await base44.asServiceRole.entities.Exercise.list('-created_date', 500);
    const existingNames = new Set(existing.map(e => e.name.toLowerCase().trim()));
    const currentCount = existing.length;

    const TARGET = 500; // long-term goal
    const BATCH_PER_RUN = 40; // generate this many per weekly run

    if (currentCount >= TARGET) {
      return Response.json({ success: true, message: `Library already has ${currentCount} exercises — target reached.` });
    }

    const toGenerate = Math.min(BATCH_PER_RUN, TARGET - currentCount);

    // Pick a rotating set of ability profiles for this run (spread coverage)
    const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % ABILITY_PROFILES.length;
    const profilesThisRun = [];
    for (let i = 0; i < 5; i++) {
      profilesThisRun.push(ABILITY_PROFILES[(weekIndex + i) % ABILITY_PROFILES.length]);
    }

    // Pick a few equipment scenarios
    const equipIdx = weekIndex % EQUIPMENT_SCENARIOS.length;
    const equipmentScenarios = [
      EQUIPMENT_SCENARIOS[equipIdx],
      EQUIPMENT_SCENARIOS[(equipIdx + 1) % EQUIPMENT_SCENARIOS.length],
      [], // always include bodyweight
    ];

    const profileDescriptions = profilesThisRun.map(p => `- ${p.label} (tags: ${p.tags.join(', ')})`).join('\n');
    const existingNamesSample = Array.from(existingNames).slice(0, 100).join(', ');

    const prompt = `You are an expert adaptive physical therapist and exercise scientist building a massive shared exercise library for people with ALL abilities and conditions.

Generate exactly ${toGenerate} NEW, UNIQUE adaptive exercises for a shared library. The library must serve everyone — from people with no legs, to those with scoliosis, heart conditions, autism, vertigo, fibromyalgia, Parkinson's, stroke recovery, and more.

═══ THIS WEEK'S FOCUS PROFILES ═══
Prioritize exercises that are especially suitable for:
${profileDescriptions}

Also include a mix of equipment scenarios:
- Bodyweight only (most important — always needed)
- With: ${equipmentScenarios.map(e => e.length === 0 ? 'bodyweight' : e.join(', ')).join(' | ')}

═══ RULES ═══
1. Every exercise MUST have accurate restriction_tags listing conditions that CONTRAINDICATE it.
2. Every exercise MUST have accurate suitable_for_tags listing conditions it's ESPECIALLY good for.
3. equipment_tags must be an EXACT list of required equipment. Empty array = truly bodyweight.
4. Do NOT repeat any of these already-existing exercises: ${existingNamesSample || 'none yet'}.
5. Include all categories: Warmup, Strength, Cardio, Balance, Flexibility, Cooldown, Breathing, Recovery.
6. Include all positions: Seated, Standing, Wheelchair, Lying down, Any.
7. Include all difficulties: Beginner, Easy, Moderate, Advanced.
8. safety_rating must be one of: Safe, Caution (only include Safe or Caution — never Avoid).
9. Be creative and specific — "Seated Resistance Band Row for Wheelchair Users", "Supine Ankle Circles for Neuropathy", "Wall-Supported Single Leg Balance", etc.
10. Include detailed step-by-step instructions and modifications.

RESTRICTION TAG VOCABULARY (use these consistently):
knee_pain, knee_replacement, hip_pain, hip_replacement, back_pain, neck_injury, shoulder_injury, wrist_injury, elbow_injury, ankle_pain, cannot_stand, wheelchair_user, no_legs, no_arms, single_leg_amputation, vertigo, balance_issues, heart_condition, copd, breathing_difficulty, osteoporosis, fracture_risk, scoliosis, multiple_sclerosis, parkinsons, stroke_recovery, cerebral_palsy, paraplegia, quadriplegia, fibromyalgia, chronic_fatigue, arthritis, rheumatoid_arthritis, high_bmi, pregnancy, postpartum, seizure_risk, no_high_impact, no_spinal_flexion, no_overhead_press, no_neck_flexion, no_head_inversion, heat_sensitive, pain_flares, immune_compromised

SUITABLE_FOR TAG VOCABULARY:
wheelchair_user, seated_only, low_mobility, bedridden, chronic_pain, heart_safe, vertigo_safe, osteoporosis_safe, balance_training, fall_prevention, stroke_recovery, autism, anxiety, depression, elderly, frailty, breathing_focused, pelvic_floor, postpartum, upper_body_only, lower_body_only, core_stability, grip_strength, coordination, proprioception, sensory_grounding, fatigue_management, pain_management, cardiac_rehab, pulmonary_rehab, neurological_rehab

Return a JSON array of exercise objects.`;

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const rawResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt + "\n\nRespond with a JSON object: { \"exercises\": [...] }" }],
      response_format: { type: "json_object" },
      max_tokens: 6000
    });

    const result = JSON.parse(rawResponse.choices[0].message.content || "{}");

    const exercises = (result.exercises || []).filter(ex => {
      // Drop duplicates and anything marked Avoid
      if (ex.safety_rating === 'Avoid') return false;
      if (existingNames.has(ex.name.toLowerCase().trim())) return false;
      return true;
    });

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
      created,
      dropped: exercises.length - created + (result.exercises?.length - exercises.length),
      totalNow: currentCount + created,
      profilesFocused: profilesThisRun.map(p => p.label)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});