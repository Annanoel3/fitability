import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CheckInCard from "@/components/dashboard/CheckInCard";
import StreakCard from "@/components/dashboard/StreakCard";
import EmergencyBanner from "@/components/dashboard/EmergencyBanner";
import { Dumbbell, Clock, Target, Sparkles, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import WorkoutPickerModal from "@/components/dashboard/WorkoutPickerModal";

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
    } else if (!profile.equipment) {
      setShowWorkoutPicker(true);
    }
  };

  const handleWorkoutPickerConfirm = (preferences) => {
    setShowWorkoutPicker(false);
    // Use first selected type if multiple, or "Mixed" if user selected that
    const workoutType = preferences.workoutTypes.includes("mixed") 
      ? "Mixed" 
      : preferences.workoutTypes[0];
    handleGenerateWorkout(todayCheckin, { ...preferences, workoutType });
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
      } catch (e) {
        // Ignore parse errors
      }
    });
    const recentExercisesStr = recentExerciseNames.size > 0 
      ? `\n\nRECENTLY USED EXERCISES (avoid these):\n${Array.from(recentExerciseNames).join(", ")}\n\nPick DIFFERENT exercises this time to provide variety.`
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
Available equipment: ${(preferences.equipment || []).join(", ") || "none — use bodyweight only"}.
IMPORTANT: Equipment is available as a supplement — use it where it enhances exercises, but the workout should NOT revolve around any single piece of equipment. Mix bodyweight and equipment-based movements naturally. If no equipment listed, use bodyweight only.
` : ""}${recentExercisesStr}

You are an expert adaptive fitness coach and physical therapist AI. Generate a highly personalized workout for this specific individual.

═══ CRITICAL SAFETY RULES (NON-NEGOTIABLE) ═══
- Every listed body limitation, disability, and pain area is a HARD CONSTRAINT. Violating any = unsafe workout.
- If ANY exercise could aggravate a listed condition, pain area, or limitation → REMOVE IT.
- Wheelchair users: ALL exercises must be performable in a wheelchair.
- Cannot stand: ZERO standing exercises.
- Always validate each exercise against the full list before including it.

═══ POSITION ASSIGNMENT RULES ═══
- "Seated" position is ONLY for users who are bedridden, wheelchair-bound, or explicitly cannot stand at all.
- Minor or moderate pain (knee pain, back pain, hip pain, etc.) does NOT make someone a seated-only exerciser.
- For users with minor/moderate pain: use Standing or Any position, but MODIFY the exercise to be gentle, low-impact, and pain-aware. Example: knee pain → standing heel raises, wall squats, gentle marching — NOT seated leg lifts for every exercise.
- A mix of positions (Standing + Any) is almost always better than all-Seated for mobile users.
- Only assign position="Seated" if the user's fitness_mode is "Wheelchair" or "Chair", or their body_limitations explicitly say they cannot stand.

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

Body Limitations (HARD CONSTRAINTS — no exceptions):
${(p.body_limitations || []).length > 0 ? (p.body_limitations || []).map(l => `  ❌ ${l}`).join("\n") : "  None listed"}

Pain Areas (with severity 0–10):
${Object.entries(p.pain_areas || {}).length > 0 ? Object.entries(p.pain_areas).map(([area, level]) => `  • ${area}: ${level}/10`).join("\n") : "  None reported"}

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
TITLE RULES: Keep it short, natural, and motivating (e.g. "Juli's Morning Strength Session", "Full-Body Power Workout"). Never include medical/clinical terms like "knee-respectful", "low-impact", "joint-friendly", "safe", or equipment names in the title. Just a clean, energizing workout name.`,
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
          showEquipment={!profile?.equipment || profile.equipment.length === 0}
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