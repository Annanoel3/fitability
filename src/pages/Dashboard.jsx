import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CheckInCard from "@/components/dashboard/CheckInCard";
import StreakCard from "@/components/dashboard/StreakCard";
import EmergencyBanner from "@/components/dashboard/EmergencyBanner";
import { Dumbbell, Clock, Target, Sparkles, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import WorkoutPickerModal from "@/components/dashboard/WorkoutPickerModal";

// Builds restriction tags used to pre-filter the exercise library.
// Three tiers:
//   ABSOLUTE (always filtered): physically impossible or medically dangerous movements
//   SEVERE (pain 7+/10): filter out exercises that directly stress that joint/area
//   MODERATE (pain 4-6/10): filter out exercises tagged for that area — LLM will substitute modified versions
// Mild pain (1-3/10) is NOT filtered here — the LLM receives the score and modifies reps/form only
function buildUserRestrictionTags(profile) {
  const tags = new Set();
  const p = profile;

  // ── ABSOLUTE: fitness mode / mobility ──
  if (p.fitness_mode === 'Wheelchair') { tags.add('cannot_stand'); tags.add('wheelchair_user'); }
  if (p.fitness_mode === 'Chair') { tags.add('seated_only'); }
  if (p.activity_level === 'Bedridden') { tags.add('bedridden'); tags.add('very_low_mobility'); }
  if (p.current_abilities?.can_stand === false) tags.add('cannot_stand');
  if (p.current_abilities?.can_walk === false) tags.add('cannot_stand');

  // ── ABSOLUTE: explicit physical impossibility from body_limitations ──
  const limitations = (p.body_limitations || []).join(' ').toLowerCase();
  if (limitations.includes('no leg') || limitations.includes('amputat') || limitations.includes('prosthetic')) tags.add('no_legs');
  if (limitations.includes('no arm')) tags.add('no_arms');
  if (limitations.includes('cannot stand') || limitations.includes("can't stand") || limitations.includes('unable to stand')) tags.add('cannot_stand');
  if (limitations.includes('paralyz') || limitations.includes('paraplegia')) tags.add('cannot_stand');

  // ── ABSOLUTE: medical conditions with non-negotiable movement restrictions ──
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  if (disabilities.includes('heart') || disabilities.includes('cardiac')) tags.add('heart_condition');
  if (disabilities.includes('copd') || disabilities.includes('emphysema')) tags.add('copd');
  if (disabilities.includes('epilepsy') || disabilities.includes('seizure')) tags.add('seizure_risk');
  if (disabilities.includes('pregnancy')) tags.add('pregnancy');
  if (disabilities.includes('paraplegia') || disabilities.includes('paraplegic')) tags.add('cannot_stand');
  if (disabilities.includes('cerebral palsy')) tags.add('cerebral_palsy');

  // ── ABSOLUTE structural conditions (always dangerous regardless of pain level) ──
  const allText = limitations + ' ' + disabilities;
  if (allText.includes('osteoporosis')) tags.add('osteoporosis');
  if (allText.includes('fracture') || allText.includes('brittle bone')) tags.add('fracture_risk');
  if (allText.includes('scoliosis')) tags.add('scoliosis');
  if (allText.includes('vertigo') || allText.includes('vestibular')) tags.add('vertigo');

  // ── SEVERE/MODERATE pain: filter exercises that directly stress that area ──
  // 7+/10 → hard filter (avoid all exercises tagged for that area)
  // 4-6/10 → still filter tagged exercises, LLM will generate modified alternatives
  Object.entries(p.pain_areas || {}).forEach(([area, level]) => {
    if (level >= 4) {
      const a = area.toLowerCase();
      if (a.includes('knee')) tags.add('knee_pain');
      if (a.includes('hip')) tags.add('hip_pain');
      if (a.includes('back') || a.includes('lumbar')) tags.add('back_pain');
      if (a.includes('neck')) tags.add('neck_injury');
      if (a.includes('shoulder')) tags.add('shoulder_injury');
      if (a.includes('wrist') || a.includes('hand')) tags.add('wrist_injury');
      if (a.includes('ankle') || a.includes('foot')) tags.add('ankle_pain');
    }
  });

  // Body limitation keywords → moderate-severity tags (will filter library but LLM generates alternatives)
  if (limitations.includes('knee')) tags.add('knee_pain');
  if (limitations.includes('hip')) tags.add('hip_pain');
  if (limitations.includes('back') || limitations.includes('lumbar') || limitations.includes('spine')) tags.add('back_pain');
  if (limitations.includes('neck') || limitations.includes('cervical')) tags.add('neck_injury');
  if (limitations.includes('shoulder') || limitations.includes('rotator')) tags.add('shoulder_injury');
  if (limitations.includes('wrist') || limitations.includes('hand')) tags.add('wrist_injury');
  if (limitations.includes('ankle') || limitations.includes('foot')) tags.add('ankle_pain');
  if (limitations.includes('balance')) tags.add('balance_issues');

  return tags;
}

// Returns a pain severity tier string for the prompt
function painTier(level) {
  if (level <= 3) return `${level}/10 — MILD: keep exercises near this area, reduce impact and range only`;
  if (level <= 6) return `${level}/10 — MODERATE: avoid exercises that load this joint heavily; use supported or reduced-ROM alternatives`;
  return `${level}/10 — SEVERE: avoid exercises that directly stress this area; work surrounding muscles instead`;
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

    // Build user restriction tags from profile to pre-filter the shared library
    const userRestrictionTags = buildUserRestrictionTags(p);
    // chair and wall are always available — everyone has them
    const userEquipment = [...new Set([
      'chair', 'wall',
      ...(preferences.equipment || p.equipment || []).map(e => e.toLowerCase().replace(/\s+/g, '_'))
    ])];

    // Pull candidate exercises from shared library — filter out restricted ones
    let candidateExercises = [];
    try {
      const allExercises = await base44.entities.Exercise.list('-created_date', 300);
      candidateExercises = allExercises.filter(ex => {
        // Skip if any restriction tag matches user's conditions
        const restricted = (ex.restriction_tags || []).some(tag => userRestrictionTags.has(tag));
        if (restricted) return false;
        // Skip if exercise requires equipment the user doesn't have
        const requiredEquip = (ex.equipment_tags || []);
        if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.includes(eq))) return false;
        // Skip recently used
        if (recentExerciseNames.has(ex.name)) return false;
        return true;
      });
    } catch (e) { /* library may be empty, LLM will generate from scratch */ }

    const libraryContext = candidateExercises.length > 0
      ? `\n\nSHARED EXERCISE LIBRARY — PRE-FILTERED FOR THIS USER:\nYou may draw exercises from this list (already verified safe for this user):\n${candidateExercises.slice(0, 60).map(ex => `• ${ex.name} [${ex.category}, ${ex.position}, ${ex.difficulty}]${ex.description ? ' — ' + ex.description.slice(0, 80) : ''}`).join('\n')}\n\nYou can use exercises from this list OR create new ones. Prefer the library for consistency.`
      : "";

    const p = profile;
    const heightFt = p.height_inches ? Math.floor(p.height_inches / 12) : null;
    const heightIn = p.height_inches ? p.height_inches % 12 : null;
    const heightStr = heightFt ? `${heightFt}'${heightIn}"` : "Not provided";
    const bmi = (p.weight_lbs && p.height_inches)
      ? ((p.weight_lbs / (p.height_inches * p.height_inches)) * 703).toFixed(1)
      : null;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert adaptive fitness coach and physical therapist AI. Generate a highly personalized workout for this specific individual.

${preferences.workoutType ? `═══ USER'S WORKOUT PREFERENCES ═══
Requested workout type: ${preferences.workoutType} — prioritize this style of exercise.
Requested intensity: ${preferences.intensity} — match this energy level throughout.
Available equipment: chair, wall${(preferences.equipment || p.equipment || []).filter(e => e !== 'none').length > 0 ? ", " + (preferences.equipment || p.equipment || []).filter(e => e !== 'none' && e !== 'chair' && e !== 'wall').join(", ") : ""} (chair and wall are always available).
HARD RULE: Only use equipment that is explicitly listed above. If none is listed, every exercise must be purely bodyweight — no dumbbells, no bands, no weights, no machines. Violating this is a critical error.
` : ""}${recentExercisesStr}

You are an expert adaptive fitness coach and physical therapist AI. Generate a highly personalized workout for this specific individual.

═══ TIERED WORKOUT RULES ═══

TIER 1 — FULL ABILITY (fitness_mode=Standard, no significant limitations):
Generate standard fitness workouts. Standing, floor, full range of motion. Adjust only for age and goals.

TIER 2 — PARTIAL LIMITATIONS (has pain areas 1-6/10, body limitations, or conditions but CAN stand):
The user can still stand and move. Do NOT give them a wheelchair or fully seated workout. Instead:
• Pain 1-3/10 in an area → include exercises near that area, reduce impact and depth, note in safety_notes
• Pain 4-6/10 in an area → avoid heavy loading of that joint, use supported or partial-ROM alternatives, still standing
• Body limitation listed → work around it with modifications, not avoidance. A person with knee pain does standing calf raises, wall squats, and upper body work — not a bed routine.
• Arthritis, fibromyalgia, chronic pain → gentle movement is therapeutic. Lower intensity, full participation.
• Parkinson's, MS, stroke recovery → include balance and coordination focus. Mix seated and standing.
• Heart condition, COPD → lower aerobic intensity, no breath-holding, still active movement.

TIER 3 — SEVERE / NON-AMBULATORY (fitness_mode=Wheelchair, cannot_stand=true, bedridden, or pain 7+/10 in a primary weight-bearing area):
• fitness_mode=Wheelchair OR cannot_stand=true → ALL exercises must be wheelchair-seated. Zero standing. Zero floor.
• activity_level=Bedridden → floor/bed exercises only.
• Pain 7+/10 in knee/hip/ankle → no standing exercises that load that joint; seated or upper-body focus.
• Pain 7+/10 in shoulder/wrist → no overhead or weight-bearing through that joint; lower body and core focus.

ABSOLUTE RULES (apply to all tiers):
• Wheelchair / cannot_stand: ZERO standing exercises.
• Seizure risk: no inversions, no head-below-heart.
• Pregnancy: no prone lying, no heavy abdominal compression.
• Osteoporosis / fracture risk: no spinal flexion, no high-impact.
• Equipment: only use what is listed. Chair and wall are always available.

Determine which tier this user falls into BEFORE selecting any exercises, then apply only the rules for that tier.

═══ FULL USER PROFILE ═══
Name context: ${p.display_name || "User"}
Age: ${p.age || "Unknown"}
Sex/Gender: ${p.sex || "Not provided"}
Height: ${heightStr}
Weight: ${p.weight_lbs ? p.weight_lbs + " lbs" : "Not provided"}
BMI (estimated): ${bmi || "Unknown"}
Activity Level: ${p.activity_level || "Unknown"}
Fitness Mode: ${p.fitness_mode || "Standard"}
Veteran: ${p.is_veteran ? `Yes — may have combat/service injuries${p.veteran_details && Object.keys(p.veteran_details).length > 0 ? ` (${JSON.stringify(p.veteran_details)})` : ""}` : "No"}

Goals: ${(p.goals || []).join(", ") || "None specified"}

Diagnosed Conditions & Disabilities:
${(p.disabilities || []).length > 0 ? (p.disabilities || []).map(d => `  • ${d}`).join("\n") : "  None listed"}

Body Limitations:
${(p.body_limitations || []).length > 0 ? (p.body_limitations || []).map(l => `  • ${l}`).join("\n") : "  None listed"}

Pain Areas (apply tiered rules above based on severity):
${Object.entries(p.pain_areas || {}).length > 0 ? Object.entries(p.pain_areas).map(([area, level]) => `  • ${area}: ${painTier(level)}`).join("\n") : "  None reported"}

Current Abilities:
${Object.entries(p.current_abilities || {}).map(([k, v]) => `  • ${k.replace(/_/g, " ")}: ${v ? "✅ Can do" : "❌ Cannot do"}`).join("\n") || "  Not assessed"}

Risk Factors:
${(p.risk_factors || []).length > 0 ? (p.risk_factors || []).map(r => `  ⚠️ ${r}`).join("\n") : "  None"}

═══ TODAY'S CHECK-IN ═══
Mood: ${(checkin || todayCheckin)?.mood || "Not checked in"}
Energy: ${(checkin || todayCheckin)?.energy || "Not checked in"}

═══ PERSONALIZATION GUIDELINES ═══
- Age ${p.age || "unknown"}: ${p.age > 65 ? "Prioritize balance, fall prevention, and joint-safe movements. Lower intensity." : p.age > 50 ? "Focus on mobility, flexibility, and moderate strength. Joint-friendly." : p.age > 35 ? "Balanced approach — strength, cardio, flexibility." : "Can handle slightly higher intensity if abilities allow."}
- Sex ${p.sex}: ${p.sex === "Female" ? "Include pelvic floor awareness, bone density exercises if relevant." : p.sex === "Male" ? "Balance upper/lower body. Watch for ego-driven overexertion." : "Balanced, inclusive exercise selection."}
- Weight ${p.weight_lbs ? p.weight_lbs + " lbs" : "unknown"}: ${p.weight_lbs > 250 ? "Choose low-impact, joint-supportive exercises. Avoid high-impact jumps." : p.weight_lbs > 180 ? "Standard adaptive approach with weight awareness." : "Standard approach."}
- If mood is "Bad" or energy is "Low"/"Exhausted": Reduce to 2–3 gentle exercises, shorter duration, no challenge.
- If energy is "High" and mood is "Great"/"Good": Can include up to 6 exercises at full appropriate intensity.


INSTRUCTIONS:
Generate a complete daily workout including warmup, 3–6 main exercises, and cooldown.
Each exercise must include: name, description, sets, reps or duration_seconds, step-by-step instructions, position, muscles_used, safety_notes.
Title and description should feel personal — reference their actual goals and situation.
TITLE RULES: Keep it short, natural, and motivating (e.g. "Juli's Morning Strength Session", "Full-Body Power Workout"). Never include medical/clinical terms like "knee-respectful", "low-impact", "joint-friendly", "safe", or equipment names in the title. Just a clean, energizing workout name.${libraryContext}${recentExercisesStr}`,
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