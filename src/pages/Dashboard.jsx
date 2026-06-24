import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CheckInCard from "@/components/dashboard/CheckInCard";
import StreakCard from "@/components/dashboard/StreakCard";
import EmergencyBanner from "@/components/dashboard/EmergencyBanner";
import { Dumbbell, Clock, Target, Sparkles, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import WorkoutPickerModal from "@/components/dashboard/WorkoutPickerModal";

// Generates granular capability/restriction tags from a user's full profile.
// These tags are used to hard-filter the exercise library before the LLM ever sees it.
// The goal: every tag represents a specific, real constraint — not a broad category.
// The LLM's job is personalization within the already-safe pool, NOT safety reasoning.
function buildUserTags(profile) {
  const restriction = new Set(); // exercises with ANY of these tags are excluded
  const capability = new Set();  // exercises must have ALL required capability tags to be included (not used for filtering yet, but passed to LLM)
  const p = profile;
  const limitations = (p.body_limitations || []).join(' ').toLowerCase();
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  const allText = limitations + ' ' + disabilities;

  // ── MOBILITY / POSITION ──
  if (p.fitness_mode === 'Wheelchair' || p.current_abilities?.can_stand === false) {
    restriction.add('cannot_stand'); restriction.add('requires_standing');
  }
  if (p.current_abilities?.can_walk === false) restriction.add('requires_walking');
  if (p.activity_level === 'Bedridden') { restriction.add('requires_standing'); restriction.add('requires_walking'); restriction.add('high_impact'); }
  if (allText.includes('paralyz') || allText.includes('paraplegia') || allText.includes('quadriplegia')) {
    restriction.add('requires_standing'); restriction.add('requires_walking'); restriction.add('requires_lower_body');
  }

  // ── AMPUTATIONS / LIMB LOSS (granular — affects only relevant exercises) ──
  const leftLeg = limitations.includes('left leg') || limitations.includes('left lower');
  const rightLeg = limitations.includes('right leg') || limitations.includes('right lower');
  const bothLegs = limitations.includes('no leg') || limitations.includes('bilateral leg') || limitations.includes('double amputat') || (leftLeg && rightLeg);
  const leftArm = limitations.includes('left arm') || limitations.includes('left upper') || limitations.includes('lost left');
  const rightArm = limitations.includes('right arm') || limitations.includes('right upper') || limitations.includes('lost right');
  const bothArms = limitations.includes('no arm') || limitations.includes('bilateral arm') || (leftArm && rightArm);

  if (bothLegs) { restriction.add('requires_legs'); restriction.add('requires_standing'); restriction.add('requires_walking'); }
  else if (leftLeg || rightLeg) { restriction.add('requires_bilateral_legs'); restriction.add('high_impact'); }
  if (bothArms) { restriction.add('requires_arms'); restriction.add('requires_upper_body'); }
  else if (leftArm) { restriction.add('requires_bilateral_arms'); restriction.add('requires_left_arm'); }
  else if (rightArm) { restriction.add('requires_bilateral_arms'); restriction.add('requires_right_arm'); }
  // Generic arm/leg amputee fallback
  if (!leftLeg && !rightLeg && !bothLegs && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('leg')) {
    restriction.add('requires_bilateral_legs');
  }
  if (!leftArm && !rightArm && !bothArms && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('arm')) {
    restriction.add('requires_bilateral_arms');
  }

  // ── JOINT PAIN — scaled by severity ──
  // Pain 1-3: no hard filter, passes through, LLM notes it
  // Pain 4-6: filter exercises that heavily load that joint
  // Pain 7+:  filter all exercises that stress that area at all
  Object.entries(p.pain_areas || {}).forEach(([area, level]) => {
    const a = area.toLowerCase();
    if (level >= 4) {
      if (a.includes('knee')) restriction.add('heavy_knee_load');
      if (a.includes('hip')) restriction.add('heavy_hip_load');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('heavy_spinal_load');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('neck_strain');
      if (a.includes('shoulder')) restriction.add('heavy_shoulder_load');
      if (a.includes('wrist') || a.includes('hand')) restriction.add('wrist_load');
      if (a.includes('elbow')) restriction.add('elbow_load');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('ankle_load');
    }
    if (level >= 7) {
      if (a.includes('knee')) { restriction.add('knee_pain'); restriction.add('knee_bend'); }
      if (a.includes('hip')) { restriction.add('hip_pain'); restriction.add('hip_flexion'); }
      if (a.includes('back') || a.includes('lumbar')) { restriction.add('back_pain'); restriction.add('spinal_flexion'); }
      if (a.includes('neck') || a.includes('cervical')) restriction.add('neck_pain');
      if (a.includes('shoulder')) restriction.add('shoulder_pain');
      if (a.includes('wrist') || a.includes('hand')) restriction.add('wrist_pain');
      if (a.includes('ankle') || a.includes('foot')) { restriction.add('ankle_pain'); restriction.add('high_impact'); }
    }
  });

  // ── BODY LIMITATION KEYWORDS → joint-specific tags ──
  if (limitations.includes('knee')) { restriction.add('heavy_knee_load'); if (limitations.includes('severe') || limitations.includes('replacement') || limitations.includes('surgery')) restriction.add('knee_bend'); }
  if (limitations.includes('hip')) { restriction.add('heavy_hip_load'); if (limitations.includes('replacement') || limitations.includes('severe')) restriction.add('hip_flexion'); }
  if (limitations.includes('back') || limitations.includes('lumbar') || limitations.includes('spine')) restriction.add('heavy_spinal_load');
  if (limitations.includes('herniat') || limitations.includes('disc')) { restriction.add('spinal_flexion'); restriction.add('heavy_spinal_load'); }
  if (limitations.includes('neck') || limitations.includes('cervical')) restriction.add('neck_strain');
  if (limitations.includes('shoulder') || limitations.includes('rotator')) restriction.add('heavy_shoulder_load');
  if (limitations.includes('wrist') || limitations.includes('carpal')) restriction.add('wrist_load');
  if (limitations.includes('ankle')) restriction.add('ankle_load');
  if (limitations.includes('balance') || limitations.includes('vestibular')) restriction.add('balance_intensive');
  if (limitations.includes('scoliosis')) {
    restriction.add('spinal_flexion');
    if (limitations.includes('severe')) { restriction.add('heavy_spinal_load'); restriction.add('twisting'); }
  }

  // ── MEDICAL CONDITIONS ──
  if (disabilities.includes('heart') || disabilities.includes('cardiac') || disabilities.includes('cardiovascular')) {
    restriction.add('high_intensity_cardio'); restriction.add('breath_holding'); restriction.add('high_impact');
    capability.add('heart_safe');
  }
  if (disabilities.includes('copd') || disabilities.includes('emphysema') || disabilities.includes('pulmonary')) {
    restriction.add('high_intensity_cardio'); restriction.add('breath_holding');
    capability.add('breathing_focused');
  }
  if (disabilities.includes('epilepsy') || disabilities.includes('seizure')) {
    restriction.add('head_inversion'); restriction.add('head_below_heart');
    capability.add('seizure_safe');
  }
  if (disabilities.includes('osteoporosis')) {
    restriction.add('spinal_flexion'); restriction.add('high_impact'); restriction.add('twisting');
    capability.add('osteoporosis_safe');
  }
  if (allText.includes('fracture') || allText.includes('brittle bone')) {
    restriction.add('high_impact'); restriction.add('heavy_load');
  }
  if (disabilities.includes('vertigo') || disabilities.includes('vestibular')) {
    restriction.add('head_inversion'); restriction.add('balance_intensive'); restriction.add('rapid_position_change');
    capability.add('vertigo_safe');
  }
  if (disabilities.includes('pregnancy')) {
    restriction.add('prone_position'); restriction.add('heavy_abdominal'); restriction.add('supine_extended');
    capability.add('pregnancy_safe');
  }
  if (disabilities.includes('parkinson')) {
    restriction.add('high_impact'); restriction.add('balance_intensive');
    capability.add('balance_training'); capability.add('coordination');
  }
  if (disabilities.includes('multiple sclerosis') || disabilities.includes(' ms ') || disabilities.includes('ms,')) {
    restriction.add('heat_intensive'); restriction.add('high_intensity_cardio');
    capability.add('fatigue_management');
  }
  if (disabilities.includes('fibromyalgia') || disabilities.includes('chronic fatigue') || disabilities.includes('cfs')) {
    restriction.add('high_intensity_cardio'); restriction.add('heavy_load');
    capability.add('fatigue_management'); capability.add('chronic_pain');
  }
  if (disabilities.includes('arthritis') || disabilities.includes('rheumatoid')) {
    restriction.add('heavy_load'); restriction.add('high_impact');
    capability.add('joint_mobility'); capability.add('chronic_pain');
  }
  if (disabilities.includes('stroke')) {
    capability.add('stroke_recovery'); capability.add('coordination'); capability.add('balance_training');
  }
  if (disabilities.includes('cerebral palsy')) {
    capability.add('coordination'); capability.add('balance_training');
  }
  if (disabilities.includes('autism') || disabilities.includes('asd')) {
    capability.add('sensory_grounding');
  }
  if (disabilities.includes('diabetes')) {
    capability.add('heart_safe'); // avoid extreme intensity spikes
  }

  // ── BMI / WEIGHT — endurance and impact constraints ──
  const bmi = (p.weight_lbs && p.height_inches)
    ? (p.weight_lbs / (p.height_inches * p.height_inches)) * 703
    : null;
  if (bmi && bmi >= 35) {
    restriction.add('high_impact'); restriction.add('high_intensity_cardio');
    capability.add('low_mobility'); capability.add('fatigue_management');
  } else if (bmi && bmi >= 30) {
    restriction.add('high_impact');
  }

  // ── ACTIVITY LEVEL — endurance ceiling ──
  if (p.activity_level === 'Bedridden' || p.activity_level === 'Mostly seated') {
    restriction.add('high_intensity_cardio'); restriction.add('high_impact');
  }

  // ── RISK FACTORS ──
  (p.risk_factors || []).forEach(r => {
    const rf = r.toLowerCase();
    if (rf.includes('fall')) restriction.add('high_fall_risk');
    if (rf.includes('surgery') && (rf.includes('recent') || rf.includes('post'))) restriction.add('heavy_load');
    if (rf.includes('pacemaker') || rf.includes('defibrillator')) { restriction.add('high_intensity_cardio'); restriction.add('electrical_hazard'); }
    if (rf.includes('blood pressure') || rf.includes('hypertension')) restriction.add('breath_holding');
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

PERSONALIZATION:
- Tune reps, sets, duration, and intensity to match this specific person's activity level, weight, age, and today's energy.
- If mood is "Bad" or energy is "Low"/"Exhausted": 2–3 exercises, short duration.
- If energy is "High" and mood is "Great"/"Good": up to 6 exercises at appropriate intensity.
- Match exercise selection to capability tags when possible.

INSTRUCTIONS:
Generate a complete workout: warmup, 3–6 main exercises, cooldown.
Each exercise: name, description, sets, reps or duration_seconds, step-by-step instructions, position, muscles_used, safety_notes.
Title: short, natural, motivating. No clinical terms in the title.
${recentExercisesStr}${libraryContext}`,
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

    await base44.entities.WorkoutPlan.create({
      title: result.title,
      description: result.description,
      plan_type: "Daily",
      date: today,
      total_duration_minutes: result.total_duration_minutes,
      difficulty_level: result.difficulty_level,
      safety_validated: true,
      safety_notes: result.safety_review,
      pre_checkin_mood: (checkin || todayCheckin)?.mood,
      pre_checkin_energy: (checkin || todayCheckin)?.energy,
      exercises_total: result.exercises?.length || 0,
      workout_data: JSON.stringify(result)
    });

    // Pre-generate exercise images in background (non-blocking)
    if (result.exercises?.length) {
      result.exercises.forEach(async (ex) => {
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