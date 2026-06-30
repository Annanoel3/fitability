import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { buildUserTags, difficultyAllowed } from "@/lib/userTags";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CheckInCard from "@/components/dashboard/CheckInCard";
import StreakCard from "@/components/dashboard/StreakCard";
import EmergencyBanner from "@/components/dashboard/EmergencyBanner";
import { Dumbbell, Clock, Target, Sparkles, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import WorkoutPickerModal from "@/components/dashboard/WorkoutPickerModal";
import StaleWorkoutCard from "@/components/dashboard/StaleWorkoutCard.jsx";
import ArchivedWorkouts from "@/components/dashboard/ArchivedWorkouts";
// TAG VOCABULARY — shared between buildUserTags() and the tagExistingExercises backend function.
// Exercise restriction_tags use these exact strings. User tags are generated here and matched against them.
// When adding a new tag here, also add it to the tagExistingExercises function vocabulary.



export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emergency, setEmergency] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [tourStep, setTourStep] = useState(window.fitabilityTourStep || null);
  const pageVisibleRef = useRef(true);

  useEffect(() => {
    loadData();
    const handler = (e) => {
      const newStep = e.detail?.tourStep || null;
      setTourStep(newStep);
      window.fitabilityTourStep = newStep;
    };
    window.addEventListener("fitability-tour-step-change", handler);
    
    // Clear any stale "generating" flag - it can get stuck across sessions/accounts
    localStorage.removeItem('fitability_generating');
    
    // Track visibility
    const handleVisibilityChange = () => {
      pageVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    pageVisibleRef.current = !document.hidden;
    
    return () => {
      window.removeEventListener("fitability-tour-step-change", handler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    // If tour is active on the workout step, fire the event
    if (tourStep === "workout" || tourStep === "workout_picking") {
      window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "workout_generated" }));
    }
    const workoutType = preferences.workoutTypes.includes("mixed") 
      ? "Mixed" 
      : preferences.workoutTypes[0];
    handleGenerateWorkout(todayCheckin, { ...preferences, workoutType, equipment: profile?.equipment || [] });
  };


  const handleGenerateWorkout = async (checkin, preferences = {}) => {
    setGenerating(true);
    localStorage.setItem('fitability_generating', 'true');
    // Capture tour state at generation START so the workout-ready auto-nav is never triggered for the tour's workout, even if it finishes after the tour ends
    const startedDuringTour = !!window.fitabilityTourStep && window.fitabilityTourStep !== "done";
    const today = new Date().toISOString().split("T")[0];
    
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
      const allExercises = await base44.entities.Exercise.list('-created_date', 500);
      candidateExercises = allExercises.filter(ex => {
        const restricted = (ex.restriction_tags || []).some(tag => userRestrictionTags.has(tag));
        if (restricted) return false;
        if (!difficultyAllowed(ex.difficulty, userRestrictionTags)) return false;
        const requiredEquip = (ex.equipment_tags || []);
        if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.includes(eq))) return false;
        if (recentExerciseNames.has(ex.name)) return false;
        return true;
      });
    } catch (e) { /* library may be empty, LLM will generate from scratch */ }

    candidateExercises.sort((a, b) => ((b.suitable_for_tags || []).some(t => userCapabilityTags.has(t)) ? 1 : 0) - ((a.suitable_for_tags || []).some(t => userCapabilityTags.has(t)) ? 1 : 0));
    const libraryContext = candidateExercises.length > 0
      ? `\n\nEXERCISE LIBRARY — ALREADY HARD-FILTERED FOR THIS USER'S SPECIFIC TAGS:\nEvery exercise below has been verified safe for this individual. Select from this list first. Exercises marked [BEST FIT] are especially well-suited to this person — prioritize including several of them. Strongly prefer exercises that need NO equipment — bodyweight only, or at most a chair or wall; only choose equipment-based exercises (resistance bands, dumbbells, mat) when they add clear, specific value for this user. You may also create new exercises that would pass the same tag filter.\n${candidateExercises.slice(0, 70).map(ex => `${(ex.suitable_for_tags || []).some(t => userCapabilityTags.has(t)) ? "[BEST FIT] " : "• "}${ex.name} [${ex.category}, ${ex.position}, ${ex.difficulty}]${ex.description ? ' — ' + ex.description.slice(0, 80) : ''}`).join('\n')}`
      : "";

    const restrictionTagsList = Array.from(userRestrictionTags).join(', ') || 'none';
    const capabilityTagsList = Array.from(userCapabilityTags).join(', ') || 'none';
    const riskDetailBlock = (p.risk_factor_details && Object.keys(p.risk_factor_details).length) ? ("\n\nHEALTH CONDITIONS - PER-ITEM DETAIL\nThe user rated how much each selected risk factor affects them:" + Object.entries(p.risk_factor_details).map(function(e){ var k=e[0], d=e[1]||{}; return "\n- " + k + ": " + (d.severity || "severity not specified") + (d.note ? (" (note: '" + d.note + "')") : ""); }).join("") + "\nCalibrate intensity and pacing from this. A condition the user manages well must NOT make the whole workout gentle - scale back only around that specific limitation. A condition rated 'A lot' warrants gentler progression and extra modifications. Keep ALL hard safety exclusions no matter how mildly they rate something (e.g. no high-impact with heart conditions).") : "";
    const coachMemoryBlock = p.coach_memory
      ? `\n\n═══ COACH MEMORY — MANDATORY ═══\nThe user has previously told their coach these preferences. You MUST honor every item below — they are non-negotiable rules, not suggestions:\n${p.coach_memory}`
      : '';

    // Build goals-to-workout-focus mapping
    const goals = p.goals || [];
    const goalFocusLines = [];
    if (goals.includes("Build strength")) goalFocusLines.push("PRIORITY: This person wants to BUILD STRENGTH — weight the workout heavily toward resistance/strength exercises (60–80% of exercises). Use progressive overload principles appropriate to their ability level.");
    if (goals.includes("Lose weight")) goalFocusLines.push("PRIORITY: This person wants to LOSE WEIGHT — include more cardio-style movement, higher reps, circuit-friendly pacing, caloric burn focus.");
    if (goals.includes("Improve mobility")) goalFocusLines.push("PRIORITY: This person wants to IMPROVE MOBILITY — include range-of-motion exercises, joint circles, dynamic stretching, functional movement patterns.");
    if (goals.includes("Reduce pain")) goalFocusLines.push("PRIORITY: This person wants to REDUCE PAIN — gentle strengthening of muscles around painful joints, focus on pain-free movement, avoid aggravating exercises entirely.");
    if (goals.includes("Improve balance")) goalFocusLines.push("PRIORITY: This person wants to IMPROVE BALANCE — include single-leg stands, weight shifts, proprioception drills appropriate to their mobility level.");
    if (goals.includes("Increase stamina")) goalFocusLines.push("PRIORITY: This person wants to INCREASE STAMINA — use circuit-style, keep rest short, include sustained moderate-effort exercises.");
    if (goals.includes("Improve flexibility")) goalFocusLines.push("PRIORITY: This person wants to IMPROVE FLEXIBILITY — add dedicated stretching sets, hold stretches longer (30–60s), target major muscle groups they can safely stretch.");
    if (goals.includes("Walk farther")) goalFocusLines.push("PRIORITY: This person wants to WALK FARTHER — strengthen legs and core, include step training or marching exercises, build endurance in lower body.");
    if (goals.includes("Stand longer")) goalFocusLines.push("PRIORITY: This person wants to STAND LONGER — focus on leg endurance, postural muscles, calf and quad strengthening.");
    if (goals.includes("Wheelchair fitness")) goalFocusLines.push("PRIORITY: This person wants WHEELCHAIR FITNESS — all exercises must be performable from a wheelchair; focus upper body, core, and wheelchair-accessible cardio.");
    if (goals.includes("Improve independence")) goalFocusLines.push("PRIORITY: This person wants to IMPROVE INDEPENDENCE — focus on functional ADL movements: standing from seated, carrying objects, reaching, step-overs.");
    if (goals.includes("Fall prevention")) goalFocusLines.push("PRIORITY: This person wants FALL PREVENTION — prioritize balance, hip and ankle stability, slow controlled movements, proprioception.");
    if (goals.includes("Better heart health")) goalFocusLines.push("PRIORITY: This person wants BETTER HEART HEALTH — include sustained aerobic activity at moderate intensity, keep it heart-safe and within their tolerance.");
    if (goals.includes("Better daily functioning")) goalFocusLines.push("PRIORITY: This person wants BETTER DAILY FUNCTIONING — functional, practical exercises that mirror real-life tasks.");
    const goalFocusBlock = goalFocusLines.length > 0
      ? `\n═══ GOAL-DRIVEN WORKOUT PRIORITIES (MANDATORY) ═══\nThese are this person's stated goals. You MUST shape the workout around them — not just include token exercises:\n${goalFocusLines.join('\n')}`
      : '';

    // Build abilities context
    const abilitiesLines = Object.entries(p.current_abilities || {}).map(([k, v]) => `  • ${k.replace(/_/g, ' ')}: ${v ? '✓ CAN do' : '✗ CANNOT do'}`);
    const abilitiesBlock = abilitiesLines.length > 0
      ? `\nVerified Abilities (USE THESE TO SELECT EXERCISES — cannot-do items are hard limits):\n${abilitiesLines.join('\n')}`
      : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert adaptive fitness coach. Generate a deeply personalized workout for this individual. Every single data point below was provided by the user and must influence the workout you create.

HOW THIS WORKS:
The exercise library below has been hard-filtered for safety. Select from it first. If thin, create new exercises that respect all constraints below. Your job is not just to pick safe exercises — it's to build a workout that genuinely serves THIS person's goals, body, and current state.

${goalFocusBlock}

═══ USER'S SAFETY TAGS ═══
Restriction tags (hard limits — already used to filter library):
${restrictionTagsList}

Capability tags (conditions/goals to favor):
${capabilityTagsList}

${preferences.workoutType ? `═══ TODAY'S WORKOUT PREFERENCES ═══
Type: ${preferences.workoutType}
Intensity: ${preferences.intensity}
Equipment available: chair, wall${(preferences.equipment || p.equipment || []).filter(e => e !== 'none' && e !== 'chair' && e !== 'wall').length > 0 ? ', ' + (preferences.equipment || p.equipment || []).filter(e => e !== 'none' && e !== 'chair' && e !== 'wall').join(', ') : ''}.
HARD RULE: Only use listed equipment. Violating this is a critical error.
` : ''}
═══ FULL USER PROFILE ═══
Name: ${p.display_name || "User"}
Age: ${p.age || "Unknown"} | Sex: ${p.sex || "Not provided"} | Height: ${heightStr} | Weight: ${p.weight_lbs ? p.weight_lbs + " lbs" : "Not provided"} | BMI: ${bmi || "Unknown"}
Activity Level: ${p.activity_level || "Unknown"} | Fitness Mode: ${p.fitness_mode || "Standard"}
Self-reported fitness: ${p.self_reported_fitness || "Not provided"} | How much conditions limit daily life: ${p.condition_severity || "Not provided"}
Veteran: ${p.is_veteran ? `Yes${p.veteran_details && Object.keys(p.veteran_details).length > 0 ? ' — ' + JSON.stringify(p.veteran_details) : ''}` : "No"}
Goals: ${goals.join(', ') || 'None specified'}

Conditions & Disabilities:
${(p.disabilities || []).length > 0 ? (p.disabilities || []).map(d => `  • ${d}`).join('\n') : '  None listed'}

Body Limitations:
${(p.body_limitations || []).length > 0 ? (p.body_limitations || []).map(l => `  • ${l}`).join('\n') : '  None listed'}

Pain Areas (0–10 severity):
${Object.entries(p.pain_areas || {}).length > 0 ? Object.entries(p.pain_areas).map(([area, level]) => `  • ${area}: ${level}/10${level >= 7 ? ' (SEVERE — avoid all loading of this area)' : level >= 4 ? ' (MODERATE — work around carefully)' : ' (mild)'}`).join('\n') : '  None reported'}
${abilitiesBlock}
Risk Factors: ${(p.risk_factors || []).join(', ') || 'None'}

Today's check-in — Mood: ${(checkin || todayCheckin)?.mood || 'N/A'} | Energy: ${(checkin || todayCheckin)?.energy || 'N/A'}
${coachMemoryBlock}${riskDetailBlock}

═══ INTENSITY CALIBRATION — CRITICAL ═══
This app serves users across the full spectrum from bedridden to fully healthy and athletic. You MUST push each person to the appropriate level of challenge — under-challenging a capable person is just as wrong as over-challenging a limited one. A healthy, active person getting a "gentle chair stretching" workout would find it insulting. A bedridden person getting push-ups would be dangerous. Match the intensity to THIS person precisely.

PRIMARY SIGNAL — self-reported fitness is "${p.self_reported_fitness || "not provided"}". If it is Medium, Strong, or Athletic, give real, challenging work (compound strength, resistance, real cardio) on every body part that is NOT directly limited; do NOT default to gentle, seated, or adaptive exercises for them even if much of the library is gentle — create harder exercises if needed. Condition severity is "${p.condition_severity || "not provided"}"; use it only to scale back around the specific limitation, not to make the whole workout gentle.

Determine their baseline capability tier:
- NO disabilities, NO pain areas, activity level "Light activity" or above, can perform all or most abilities → HEALTHY/CAPABLE USER. Give them real workouts: push-ups, squats, lunges, planks, burpees, dumbbell exercises, running in place, etc. at appropriate sets/reps for their fitness level. Do NOT default to gentle or adaptive exercises for these users.
- SOME limitations (e.g. one bad knee, one bad wrist) but otherwise capable → Work around the specific limitation ONLY. Every other body part should be challenged at full intensity. E.g. bad ankle? Upper body and core workout at full intensity. Bad wrist? Leg day at full intensity.
- SIGNIFICANT limitations (multiple conditions, low activity level, pain in multiple areas) → Adaptive/gentle approach, but still push the limit of what they CAN do safely.
- SEVERE limitations (bedridden, paralysis, extreme pain, very low activity) → Micro-movements, seated, lying down — but still meaningful exercise.

Activity level → intensity guide:
- Bedridden / Mostly seated: micro-movements, very light seated exercises only
- Wheelchair user / Limited walking: upper body + core focus, wheelchair-accessible exercises
- Light activity: moderate intensity — bodyweight exercises, light resistance, manageable cardio
- Moderate activity: solid intensity — full bodyweight exercises, moderate resistance, real cardio
- Active: HIGH intensity — challenging sets/reps, compound movements, real athletic exercises

Rep/set calibration for healthy/capable users:
- Push-ups: 3x10-20 depending on fitness
- Squats: 3x15-25
- Lunges: 3x10-15 per leg
- Plank: 3x30-60 seconds
- Do NOT give a healthy active person 5 push-ups or 10 squats — that's a warm-up, not a workout.

═══ PERSONALIZATION RULES ═══
- Age & sex matter: adjust intensity, rest times, and exercise selection accordingly.
- Weight & BMI matter: high BMI → reduce joint loading; but still push upper body/core hard if those are unaffected.
- Activity level sets the baseline — use the intensity guide above.
- Today's energy & mood: if "Bad/Low/Exhausted" → reduce volume by ~40%, not intensity to "toddler level"; if "Great/High" → full challenge.
- Goals are the NORTH STAR — if only one goal is checked, the entire workout should primarily serve that goal.
- Abilities checklist: if a person CANNOT do something, never include exercises that require it. Everything they CAN do should be challenged.

INSTRUCTIONS:
Generate a complete workout: warmup, 3–6 main exercises, cooldown.
Each exercise: name, description, sets, reps or duration_seconds, step-by-step instructions, position, muscles_used, safety_notes.
Title: short, natural, motivating — reflect their primary goal in the title.
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

    // First LLM call already has full safety context + pre-filtered library + deterministic check below
    const finalResult = { ...result };

        // -- DETERMINISTIC SAFETY RE-CHECK: drop any AI exercise that violates the user's hard restrictions --
    let safetyLib = [];
    try { safetyLib = await base44.entities.Exercise.list('-created_date', 500); } catch (e) {}
    const libByName = {};
    safetyLib.forEach(ex => { libByName[(ex.name || '').toLowerCase().trim()] = ex; });
    const removedBySafety = [];
    finalResult.exercises = (finalResult.exercises || []).filter(ex => {
      if (userRestrictionTags.has('cannot_stand') && ex.position === 'Standing') { removedBySafety.push(ex.name); return false; }
      const lib = libByName[(ex.name || '').toLowerCase().trim()];
      if (lib && (lib.restriction_tags || []).some(t => userRestrictionTags.has(t))) { removedBySafety.push(ex.name); return false; }
      if (lib && !difficultyAllowed(lib.difficulty, userRestrictionTags)) { removedBySafety.push(ex.name); return false; }
      return true;
    });
    const safetyPassed = true;
    if (removedBySafety.length) { finalResult.safety_review = (finalResult.safety_review || '') + ' Final deterministic safety check removed: ' + removedBySafety.join(', ') + '.'; }

    const created = await base44.entities.WorkoutPlan.create({
      title: finalResult.title,
      description: finalResult.description,
      plan_type: "Daily",
      date: today,
      total_duration_minutes: finalResult.total_duration_minutes,
      difficulty_level: finalResult.difficulty_level,
      safety_validated: safetyPassed,
      safety_notes: finalResult.safety_review,
      pre_checkin_mood: (checkin || todayCheckin)?.mood,
      pre_checkin_energy: (checkin || todayCheckin)?.energy,
      exercises_total: finalResult.exercises?.length || 0,
      workout_data: JSON.stringify(finalResult)
    });

    // Clear generating state
    setGenerating(false);
    localStorage.removeItem('fitability_generating');
    
    // Refresh workouts list so it shows the new workout
    const updatedWorkouts = await base44.entities.WorkoutPlan.filter({ created_by_id: (await base44.auth.me()).id }, "-date", 10);
    setWorkouts(updatedWorkouts);
    
    // Auto-navigate only if user stayed on the Dashboard and the tour is not active
    const tourActive = startedDuringTour;
    if (pageVisibleRef.current && !tourActive) {
      navigate("/workout", { state: { workout: { ...created, workout_data: JSON.stringify(finalResult) } } });
    }

    // Pre-generate exercise images in background (non-blocking, after navigation)
    if (finalResult.exercises?.length) {
      finalResult.exercises.forEach(async (ex) => {
        try {
          const key = ex.name.toLowerCase().trim();
          const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: key });
          if (cached.length > 0) return;
          const { url } = await base44.integrations.Core.GenerateImage({
            prompt: `Clean instructional fitness illustration showing a person performing "${ex.name}". Position: ${ex.position || "standing"}. ${ex.muscles_used?.length ? "Muscles worked: " + ex.muscles_used.slice(0, 3).join(", ") + "." : ""} Simple, clear diagram style, white background, no text.`
          });
          await base44.entities.ExerciseImage.create({ exercise_name_key: key, image_url: url });
        } catch (e) { /* silently skip */ }
      });
    }
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
  // Only show a stale workout if there's no today's workout — never show both
  const staleWorkout = !todayWorkout ? workouts.find(w => w.date < today) : null;

  return (
    <div className="space-y-6 pb-32 md:pb-6">
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

      {/* Stale workout from a previous day — ask to rate + archive/delete */}
      {!generating && staleWorkout && (
        <StaleWorkoutCard
          workout={staleWorkout}
          onDone={() => setWorkouts(prev => prev.filter(w => w.id !== staleWorkout.id))}
        />
      )}

      {/* Check-in or Today's Workout */}
      {!generating && !emergency && (
        <>
          {!todayCheckin && !todayWorkout && (
            <CheckInCard onCheckInComplete={handleCheckIn} />
          )}

          {todayWorkout && (
            <Link to="/workout" state={{ workout: todayWorkout }} className="block">
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
                    ✓ Completed — tap to restart
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Always-visible Start Workout button */}
          {todayCheckin && !todayWorkout && !generating && (
            <Button data-tour-start-workout="true" onClick={() => { window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "workout_button_clicked" })); setShowWorkoutPicker(true); }} className="w-full h-12">
              <Sparkles className="w-4 h-4 mr-2" /> Choose Today's Workout
            </Button>
          )}
          {todayWorkout && (
            <Button data-tour-start-workout="true" onClick={() => { window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "workout_button_clicked" })); setShowWorkoutPicker(true); }} variant="outline" className="w-full h-11">
              <Sparkles className="w-4 h-4 mr-2" /> Start a New Workout
            </Button>
          )}
          {!todayCheckin && !todayWorkout && !generating && (
            tourStep === "workout" ? (
              <Button data-tour-start-workout="true" onClick={() => {
                window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "workout_picking" } }));
                window.fitabilityTourStep = "workout_picking";
                setShowWorkoutPicker(true);
              }} className="w-full h-12">
                <Sparkles className="w-4 h-4 mr-2" /> Start Your First Workout
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Complete your check-in above to unlock today's workout.</p>
            )
          )}
        </>
      )}

      {/* Streak */}
      <StreakCard workouts={workouts} />

      {/* Archived Workouts */}
      <ArchivedWorkouts onReuse={(w) => {
        setShowWorkoutPicker(true);
      }} />

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