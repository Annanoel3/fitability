import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CheckInCard from "@/components/dashboard/CheckInCard";
import StreakCard from "@/components/dashboard/StreakCard";
import EmergencyBanner from "@/components/dashboard/EmergencyBanner";
import { Dumbbell, Clock, Target, Sparkles, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import WorkoutPickerModal from "@/components/dashboard/WorkoutPickerModal";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

// TAG VOCABULARY — shared between buildUserTags() and the tagExistingExercises backend function.
// Exercise restriction_tags use these exact strings. User tags are generated here and matched against them.
// When adding a new tag here, also add it to the tagExistingExercises function vocabulary.

function buildUserTags(profile) {
  const restriction = new Set(); // exercises with ANY of these tags are excluded for this user
  const capability = new Set();  // passed to LLM to guide exercise selection toward suitable exercises
  const p = profile;
  const limitations = (p.body_limitations || []).join(' ').toLowerCase();
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  const allText = limitations + ' ' + disabilities;

  // ── MOBILITY / POSITION ──
  if (p.fitness_mode === 'Wheelchair' || p.current_abilities?.can_stand === false) {
    restriction.add('cannot_stand'); restriction.add('wheelchair_user');
  }
  if (p.current_abilities?.can_walk === false) restriction.add('cannot_stand');
  if (p.activity_level === 'Bedridden') {
    restriction.add('cannot_stand'); restriction.add('no_high_impact'); restriction.add('very_low_mobility');
  }
  if (allText.includes('paralyz') || allText.includes('paraplegia') || allText.includes('quadriplegia')) {
    restriction.add('cannot_stand'); restriction.add('paraplegia');
  }

  // ── AMPUTATIONS / LIMB LOSS ──
  const leftLeg = limitations.includes('left leg') || limitations.includes('left lower');
  const rightLeg = limitations.includes('right leg') || limitations.includes('right lower');
  const bothLegs = limitations.includes('no leg') || limitations.includes('bilateral leg') || limitations.includes('double amputat') || (leftLeg && rightLeg);
  const leftArm = limitations.includes('left arm') || limitations.includes('left upper') || limitations.includes('lost left');
  const rightArm = limitations.includes('right arm') || limitations.includes('right upper') || limitations.includes('lost right');
  const bothArms = limitations.includes('no arm') || limitations.includes('bilateral arm') || (leftArm && rightArm);

  if (bothLegs) { restriction.add('no_legs'); restriction.add('cannot_stand'); restriction.add('no_high_impact'); }
  else if (leftLeg || rightLeg) { restriction.add('single_leg_amputation'); restriction.add('no_high_impact'); }
  if (bothArms) { restriction.add('no_arms'); }
  else if (leftArm) { restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms'); }
  else if (rightArm) { restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms'); }
  // Generic fallback
  if (!bothLegs && !leftLeg && !rightLeg && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('leg')) {
    restriction.add('single_leg_amputation'); restriction.add('no_high_impact');
  }
  if (!bothArms && !leftArm && !rightArm && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('arm')) {
    restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms');
  }

  // ── JOINT PAIN — scaled by severity ──
  // Pain 1-3: LLM handles via safety_notes, no hard filter
  // Pain 4-6: filter exercises that heavily load that joint
  // Pain 7+:  filter all exercises that stress that area
  Object.entries(p.pain_areas || {}).forEach(([area, level]) => {
    const a = area.toLowerCase();
    if (level >= 4) {
      if (a.includes('knee')) restriction.add('knee_pain');
      if (a.includes('hip')) restriction.add('hip_pain');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('back_pain');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('neck_injury');
      if (a.includes('shoulder')) restriction.add('shoulder_injury');
      if (a.includes('wrist') || a.includes('hand')) restriction.add('wrist_injury');
      if (a.includes('elbow')) restriction.add('elbow_injury');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('ankle_pain');
    }
    if (level >= 7) {
      if (a.includes('knee')) restriction.add('knee_replacement'); // most restrictive knee tag
      if (a.includes('hip')) restriction.add('hip_replacement');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('no_spinal_flexion');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('no_neck_flexion');
      if (a.includes('shoulder')) restriction.add('no_overhead_press');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('no_high_impact');
    }
  });

  // ── BODY LIMITATION KEYWORDS → joint tags ──
  if (limitations.includes('knee')) {
    restriction.add('knee_pain');
    if (limitations.includes('replacement') || limitations.includes('severe') || limitations.includes('surgery')) restriction.add('knee_replacement');
  }
  if (limitations.includes('hip')) {
    restriction.add('hip_pain');
    if (limitations.includes('replacement') || limitations.includes('severe')) restriction.add('hip_replacement');
  }
  if (limitations.includes('back') || limitations.includes('lumbar') || limitations.includes('spine')) restriction.add('back_pain');
  if (limitations.includes('herniat') || limitations.includes('disc')) { restriction.add('back_pain'); restriction.add('no_spinal_flexion'); }
  if (limitations.includes('neck') || limitations.includes('cervical')) restriction.add('neck_injury');
  if (limitations.includes('shoulder') || limitations.includes('rotator')) restriction.add('shoulder_injury');
  if (limitations.includes('wrist') || limitations.includes('carpal')) restriction.add('wrist_injury');
  if (limitations.includes('ankle')) restriction.add('ankle_pain');
  if (limitations.includes('balance')) restriction.add('balance_issues');
  if (limitations.includes('scoliosis')) {
    restriction.add('scoliosis');
    if (limitations.includes('severe')) restriction.add('no_spinal_flexion');
  }
  if (limitations.includes('osteoporosis')) { restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact'); }

  // ── MEDICAL CONDITIONS ──
  if (disabilities.includes('heart') || disabilities.includes('cardiac') || disabilities.includes('cardiovascular')) {
    restriction.add('heart_condition'); restriction.add('no_high_impact'); restriction.add('breathing_difficulty');
    capability.add('heart_safe');
  }
  if (disabilities.includes('copd') || disabilities.includes('emphysema') || disabilities.includes('pulmonary')) {
    restriction.add('copd'); restriction.add('breathing_difficulty');
    capability.add('breathing_focused'); capability.add('heart_safe');
  }
  if (disabilities.includes('epilepsy') || disabilities.includes('seizure')) {
    restriction.add('seizure_risk'); restriction.add('no_head_inversion');
    capability.add('vertigo_safe');
  }
  if (allText.includes('osteoporosis')) {
    restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact');
    capability.add('osteoporosis_safe');
  }
  if (allText.includes('fracture') || allText.includes('brittle bone')) {
    restriction.add('fracture_risk'); restriction.add('no_high_impact');
  }
  if (disabilities.includes('vertigo') || disabilities.includes('vestibular')) {
    restriction.add('vertigo'); restriction.add('balance_issues'); restriction.add('no_head_inversion');
    capability.add('vertigo_safe');
  }
  if (disabilities.includes('pregnancy')) {
    restriction.add('pregnancy'); restriction.add('no_spinal_flexion');
    capability.add('pregnancy_safe');
  }
  if (disabilities.includes('parkinson')) {
    restriction.add('parkinsons'); restriction.add('no_high_impact');
    capability.add('balance_training'); capability.add('coordination');
  }
  if (disabilities.includes('multiple sclerosis') || disabilities.includes(' ms ') || disabilities.includes('ms,')) {
    restriction.add('multiple_sclerosis'); restriction.add('heat_sensitive');
    capability.add('fatigue_management');
  }
  if (disabilities.includes('fibromyalgia') || disabilities.includes('chronic fatigue') || disabilities.includes('cfs')) {
    restriction.add('fibromyalgia'); restriction.add('chronic_fatigue');
    capability.add('fatigue_management'); capability.add('chronic_pain');
  }
  if (disabilities.includes('arthritis') || disabilities.includes('rheumatoid')) {
    restriction.add('arthritis'); restriction.add('no_high_impact');
    capability.add('joint_mobility'); capability.add('chronic_pain');
  }
  if (disabilities.includes('rheumatoid')) restriction.add('rheumatoid_arthritis');
  if (disabilities.includes('stroke')) {
    restriction.add('stroke_recovery'); // exercises tagged stroke_recovery are FOR this person, not against — LLM uses capability tags instead
    capability.add('stroke_recovery'); capability.add('coordination'); capability.add('balance_training');
  }
  if (disabilities.includes('cerebral palsy')) {
    restriction.add('cerebral_palsy');
    capability.add('coordination'); capability.add('balance_training');
  }
  if (disabilities.includes('autism') || disabilities.includes('asd')) {
    capability.add('sensory_grounding');
  }
  if (disabilities.includes('diabetes')) {
    capability.add('heart_safe');
  }

  // ── BMI / WEIGHT ──
  const bmi = (p.weight_lbs && p.height_inches)
    ? (p.weight_lbs / (p.height_inches * p.height_inches)) * 703
    : null;
  if (bmi && bmi >= 35) {
    restriction.add('no_high_impact'); restriction.add('high_bmi');
    capability.add('low_mobility'); capability.add('fatigue_management');
  } else if (bmi && bmi >= 30) {
    restriction.add('no_high_impact');
  }

  // ── ACTIVITY LEVEL ──
  if (p.activity_level === 'Bedridden' || p.activity_level === 'Mostly seated') {
    restriction.add('no_high_impact'); restriction.add('very_low_mobility');
  }

  // ── RISK FACTORS ──
  (p.risk_factors || []).forEach(r => {
    const rf = r.toLowerCase();
    if (rf.includes('fall')) restriction.add('balance_issues');
    if (rf.includes('surgery') && (rf.includes('recent') || rf.includes('post'))) restriction.add('fracture_risk');
    if (rf.includes('pacemaker') || rf.includes('defibrillator')) { restriction.add('heart_condition'); restriction.add('breathing_difficulty'); }
    if (rf.includes('blood pressure') || rf.includes('hypertension')) restriction.add('breathing_difficulty');
    if (rf.includes('immune') || rf.includes('immunocompromised')) restriction.add('immune_compromised');
  });

  return { restriction, capability };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emergency, setEmergency] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Track activity and capture timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await base44.functions.invoke('trackUserActivity', { timezone: tz });

    const profiles = await base44.entities.UserProfile.filter({});
    if (profiles.length === 0) {
      navigate("/onboarding");
      return;
    }
    setProfile(profiles[0]);
    if (profiles[0].onboarding_completed && !profiles[0].onboarding_tour_completed) {
      setShowTour(true);
    }

    const allWorkouts = await base44.entities.WorkoutPlan.filter({ archived: false }, "-date", 30);
    setWorkouts(allWorkouts);

    const today = new Date().toISOString().split("T")[0];
    const todayLogs = await base44.entities.PainLog.filter({ date: today });
    if (todayLogs.length > 0) {
      setTodayCheckin(todayLogs[0]);
      if (todayLogs[0].mood === "Severe pain") setEmergency(true);
    }
    setLoading(false);
  };

  const handleCheckIn = (checkin) => {
    setTodayCheckin(checkin);
    if (checkin.mood === "Severe pain") {
      setEmergency(true);
    } else {
      setShowWorkoutPicker(true);
    }
  };

  const handleWorkoutPickerConfirm = (preferences) => {
    setShowWorkoutPicker(false);
    const workoutType = preferences.workoutTypes.includes("mixed") 
      ? "Mixed" 
      : preferences.workoutTypes[0];
    handleGenerateWorkout(todayCheckin, { ...preferences, workoutType, equipment: profile?.equipment || [] });
  };


  const handleGenerateWorkout = async (checkin, preferences = {}) => {
    setGenerating(true);
    const today = new Date().toISOString().split("T")[0];
    
    const existingToday = workouts.find(w => w.date === today);
    if (existingToday) {
      return;
    }

    // Fetch recent workouts to avoid repeating exercises
    const recentWorkouts = await base44.entities.WorkoutPlan.filter({ completed: true }, "-date", 5);
    const recentExerciseNames = new Set();
    recentWorkouts.forEach(w => {
      try {
        const data = JSON.parse(w.workout_data || "{}");
        if (data.exercises && Array.isArray(data.exercises)) {
          data.exercises.forEach(ex => recentExerciseNames.add(ex.name));
        }
      } catch (e) {}
    });
    const recentExercisesStr = recentExerciseNames.size > 0 
      ? `\n\nRECENTLY USED EXERCISES (avoid repeating these):\n${Array.from(recentExerciseNames).join(", ")}`
      : "";

    // Fetch user's deleted exercises — they should NEVER appear in workouts
    const deletedRecs = await base44.entities.DeletedExercise.filter({});
    const deletedExercisesStr = deletedRecs.length > 0
      ? `\n\nDELETED EXERCISES (ABSOLUTELY DO NOT INCLUDE THESE IN THE WORKOUT):\n${deletedRecs.map(d => d.exercise_name).join(", ")}`
      : "";

    const p = profile;
    const heightFt = p.height_inches ? Math.floor(p.height_inches / 12) : null;
    const heightIn = p.height_inches ? p.height_inches % 12 : null;
    const heightStr = heightFt ? `${heightFt}'${heightIn}"` : "Not provided";
    const bmi = (p.weight_lbs && p.height_inches)
      ? ((p.weight_lbs / (p.height_inches * p.height_inches)) * 703).toFixed(1)
      : null;

    // Build granular user tags from full profile
    const { restriction: userRestrictionTags, capability: userCapabilityTags } = buildUserTags(p);
    // chair and wall are always available — everyone has them
    const userEquipment = [...new Set([
      'chair', 'wall',
      ...(preferences.equipment || p.equipment || []).map(e => e.toLowerCase().replace(/\s+/g, '_'))
    ])];

    // Hard-filter exercise library: exclude any exercise whose restriction_tags overlap with user's restriction tags
    let candidateExercises = [];
    try {
      const allExercises = await base44.entities.Exercise.list('-created_date', 300);
      candidateExercises = allExercises.filter(ex => {
        const restricted = (ex.restriction_tags || []).some(tag => userRestrictionTags.has(tag));
        if (restricted) return false;
        const requiredEquip = (ex.equipment_tags || []);
        if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.includes(eq))) return false;
        if (recentExerciseNames.has(ex.name)) return false;
        return true;
      });
    } catch (e) { /* library may be empty, LLM will generate from scratch */ }

    const libraryContext = candidateExercises.length > 0
      ? `\n\nEXERCISE LIBRARY — ALREADY HARD-FILTERED FOR THIS USER'S SPECIFIC TAGS:\nEvery exercise below has been verified safe for this individual. Select from this list first. You may also create new exercises that would pass the same tag filter.\n${candidateExercises.slice(0, 70).map(ex => `• ${ex.name} [${ex.category}, ${ex.position}, ${ex.difficulty}]${ex.description ? ' — ' + ex.description.slice(0, 80) : ''}`).join('\n')}`
      : "";

    const restrictionTagsList = Array.from(userRestrictionTags).join(', ') || 'none';
    const capabilityTagsList = Array.from(userCapabilityTags).join(', ') || 'none';
    const coachMemoryBlock = p.coach_memory
      ? `\n\n═══ COACH MEMORY — MANDATORY ═══\nThe user has previously told their coach these preferences. You MUST honor every item below — they are non-negotiable rules, not suggestions:\n${p.coach_memory}`
      : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert adaptive fitness coach. Generate a personalized workout for this individual.

HOW THIS WORKS:
The exercise library below has already been hard-filtered using this person's restriction tags. Every exercise listed is confirmed safe for them. Your job is to select from that pool and personalize reps, sets, and intensity based on their full profile. If the library is empty or thin, create new exercises that would NOT violate any of their restriction tags.

═══ USER'S COMPUTED TAGS ═══
Restriction tags (things this person cannot safely do — already used to filter the library):
${restrictionTagsList}

Capability tags (conditions/goals to favor when selecting):
${capabilityTagsList}

${preferences.workoutType ? `═══ WORKOUT PREFERENCES ═══
Type: ${preferences.workoutType}
Intensity: ${preferences.intensity}
Equipment available: chair, wall${(preferences.equipment || p.equipment || []).filter(e => e !== 'none' && e !== 'chair' && e !== 'wall').length > 0 ? ', ' + (preferences.equipment || p.equipment || []).filter(e => e !== 'none' && e !== 'chair' && e !== 'wall').join(', ') : ''}.
HARD RULE: Only use listed equipment. Violating this is a critical error.
` : ''}
═══ FULL USER PROFILE ═══
Name: ${p.display_name || "User"}
Age: ${p.age || "Unknown"} | Sex: ${p.sex || "Not provided"} | Height: ${heightStr} | Weight: ${p.weight_lbs ? p.weight_lbs + " lbs" : "Not provided"} | BMI: ${bmi || "Unknown"}
Activity Level: ${p.activity_level || "Unknown"} | Fitness Mode: ${p.fitness_mode || "Standard"}
Veteran: ${p.is_veteran ? `Yes${p.veteran_details && Object.keys(p.veteran_details).length > 0 ? ' — ' + JSON.stringify(p.veteran_details) : ''}` : "No"}
Goals: ${(p.goals || []).join(', ') || 'None specified'}

Conditions & Disabilities:
${(p.disabilities || []).length > 0 ? (p.disabilities || []).map(d => `  • ${d}`).join('\n') : '  None listed'}

Body Limitations:
${(p.body_limitations || []).length > 0 ? (p.body_limitations || []).map(l => `  • ${l}`).join('\n') : '  None listed'}

Pain Areas (0–10):
${Object.entries(p.pain_areas || {}).length > 0 ? Object.entries(p.pain_areas).map(([area, level]) => `  • ${area}: ${level}/10`).join('\n') : '  None reported'}

Current Abilities:
${Object.entries(p.current_abilities || {}).map(([k, v]) => `  • ${k.replace(/_/g, ' ')}: ${v ? 'Yes' : 'No'}`).join('\n') || '  Not assessed'}

Risk Factors: ${(p.risk_factors || []).join(', ') || 'None'}

Today's check-in — Mood: ${(checkin || todayCheckin)?.mood || 'N/A'} | Energy: ${(checkin || todayCheckin)?.energy || 'N/A'}
${coachMemoryBlock}

PERSONALIZATION:
- Tune reps, sets, duration, and intensity to match this specific person's activity level, weight, age, and today's energy.
- If mood is "Bad" or energy is "Low"/"Exhausted": 2–3 exercises, short duration.
- If energy is "High" and mood is "Great"/"Good": up to 6 exercises at appropriate intensity.
- Match exercise selection to capability tags when possible.

INSTRUCTIONS:
Generate a complete workout: warmup, 3–6 main exercises, cooldown.
Each exercise: name, description, sets, reps or duration_seconds, step-by-step instructions, position, muscles_used, safety_notes.
Title: short, natural, motivating. No clinical terms in the title.
${recentExercisesStr}${libraryContext}${deletedExercisesStr}`,
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

    // ── VALIDATION PASS: LLM checks the generated workout against the user's profile ──
    // This catches any exercise that slipped through that the user genuinely cannot do.
    const validation = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a physical therapist reviewing a generated workout for a specific patient. Your only job is to check whether any exercise in this workout is inappropriate for this person given their profile or their stated coach preferences, and if so, replace it with a suitable alternative.

PATIENT PROFILE:
Age: ${p.age || 'Unknown'} | Sex: ${p.sex || 'Unknown'} | Weight: ${p.weight_lbs ? p.weight_lbs + ' lbs' : 'Unknown'} | BMI: ${bmi || 'Unknown'}
Activity Level: ${p.activity_level || 'Unknown'} | Fitness Mode: ${p.fitness_mode || 'Standard'}
Conditions: ${(p.disabilities || []).join(', ') || 'None'}
Body Limitations: ${(p.body_limitations || []).join(', ') || 'None'}
Pain Areas: ${Object.entries(p.pain_areas || {}).map(([a, l]) => `${a}: ${l}/10`).join(', ') || 'None'}
Current Abilities: ${Object.entries(p.current_abilities || {}).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v ? 'Yes' : 'No'}`).join(', ') || 'Not assessed'}
Equipment: ${userEquipment.join(', ')}
${p.coach_memory ? `\nCoach memory (also enforce these preferences during validation):\n${p.coach_memory}` : ''}

GENERATED WORKOUT TO REVIEW:
${JSON.stringify({ exercises: result.exercises, warmup: result.warmup, cooldown: result.cooldown }, null, 2)}

REVIEW CHECKLIST — flag an exercise if:
- It requires a body part this person doesn't have or cannot use
- It requires standing/walking when the person cannot stand
- It uses equipment not in their equipment list
- It involves movement (high impact, spinal flexion, overhead press, etc.) that is explicitly unsafe given their conditions
- The reps/sets/duration are wildly unrealistic given their activity level, weight, or energy today (mood: ${(checkin || todayCheckin)?.mood}, energy: ${(checkin || todayCheckin)?.energy})

For each flagged exercise, replace it with a realistic alternative that this person CAN do. Keep the same structure. If nothing needs changing, return the workout unchanged.

Return the complete corrected workout in the same JSON structure.`,
      response_json_schema: {
        type: "object",
        properties: {
          exercises: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, sets: { type: "number" }, reps: { type: "number" }, duration_seconds: { type: "number" }, instructions: { type: "string" }, position: { type: "string" }, muscles_used: { type: "array", items: { type: "string" } }, safety_notes: { type: "string" } } } },
          warmup: { type: "object", properties: { name: { type: "string" }, duration_minutes: { type: "number" }, instructions: { type: "string" } } },
          cooldown: { type: "object", properties: { name: { type: "string" }, duration_minutes: { type: "number" }, instructions: { type: "string" } } },
          changes_made: { type: "array", items: { type: "string" } }
        }
      },
      model: "gpt_5_4"
    });

    // Merge validated exercises back into result
    const finalResult = {
      ...result,
      exercises: validation.exercises || result.exercises,
      warmup: validation.warmup || result.warmup,
      cooldown: validation.cooldown || result.cooldown,
      safety_review: (result.safety_review || '') + (validation.changes_made?.length ? '\n\nValidation changes: ' + validation.changes_made.join('; ') : '')
    };

    await base44.entities.WorkoutPlan.create({
      title: finalResult.title,
      description: finalResult.description,
      plan_type: "Daily",
      date: today,
      total_duration_minutes: finalResult.total_duration_minutes,
      difficulty_level: finalResult.difficulty_level,
      safety_validated: true,
      safety_notes: finalResult.safety_review,
      pre_checkin_mood: (checkin || todayCheckin)?.mood,
      pre_checkin_energy: (checkin || todayCheckin)?.energy,
      exercises_total: finalResult.exercises?.length || 0,
      workout_data: JSON.stringify(finalResult)
    });

    // Pre-generate exercise images in background (non-blocking)
    if (finalResult.exercises?.length) {
      finalResult.exercises.forEach(async (ex) => {
        try {
          const key = ex.name.toLowerCase().trim();
          const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: key });
          if (cached.length > 0) return; // already cached
          const { url } = await base44.integrations.Core.GenerateImage({
            prompt: `Clean instructional fitness illustration showing a person performing "${ex.name}". Position: ${ex.position || "standing"}. ${ex.muscles_used?.length ? "Muscles worked: " + ex.muscles_used.slice(0, 3).join(", ") + "." : ""} Simple, clear diagram style, white background, no text.`
          });
          await base44.entities.ExerciseImage.create({ exercise_name_key: key, image_url: url });
        } catch (e) { /* silently skip */ }
      });
    }

    setGenerating(false);
    navigate("/workout");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = workouts.find(w => w.date === today);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {showTour && profile && (
        <OnboardingTour
          profile={profile}
          onComplete={() => {
            setShowTour(false);
            // Force profile refresh to confirm tour completion is persisted
            setProfile(p => ({ ...p, onboarding_tour_completed: true }));
          }}
        />
      )}
      {showWorkoutPicker && (
        <WorkoutPickerModal 
          onConfirm={handleWorkoutPickerConfirm}
          onClose={() => setShowWorkoutPicker(false)}
        />
      )}
      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          Welcome back, {profile?.display_name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {todayWorkout ? "Your workout is ready." : "Let's check in and get moving."}
        </p>
      </div>

      {/* Emergency Banner */}
      {emergency && (
        <EmergencyBanner onDismiss={() => setEmergency(false)} />
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="font-heading font-bold text-lg">Creating your personalized workout...</h3>
          <p className="text-sm text-muted-foreground">
            Our AI is analyzing your profile, checking safety constraints, and building a plan tailored to your abilities.
          </p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </div>
      )}

      {/* Check-in or Today's Workout */}
      {!generating && !emergency && (
        <>
          {!todayCheckin && !todayWorkout && (
            <CheckInCard onCheckInComplete={handleCheckIn} />
          )}

          {todayWorkout && (
            <Link to="/workout" className="block">
              <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">{todayWorkout.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {todayWorkout.total_duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" />
                          {todayWorkout.difficulty_level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                {todayWorkout.completed && (
                  <div className="mt-3 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium text-center">
                    ✓ Completed
                  </div>
                )}
              </div>
            </Link>
          )}

          {todayCheckin && !todayWorkout && !generating && (
            <Button onClick={() => setShowWorkoutPicker(true)} className="w-full h-12">
              <Sparkles className="w-4 h-4 mr-2" /> Choose Today's Workout
            </Button>
          )}
        </>
      )}

      {/* Streak */}
      <StreakCard workouts={workouts} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/exercises" className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors">
          <BookOpenIcon className="w-6 h-6 text-primary mb-2" />
          <div className="font-semibold text-sm">Exercise Library</div>
          <div className="text-xs text-muted-foreground mt-1">Browse safe exercises</div>
        </Link>
        <Link to="/progress" className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors">
          <TrendingUp className="w-6 h-6 text-primary mb-2" />
          <div className="font-semibold text-sm">Track Progress</div>
          <div className="text-xs text-muted-foreground mt-1">See your journey</div>
        </Link>
      </div>
    </div>
  );
}

function BookOpenIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}