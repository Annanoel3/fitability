import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, CheckCircle2, Circle, Shield, ChevronDown, ChevronUp, Trophy } from "lucide-react";

export default function WorkoutPage() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadTodayWorkout();
  }, []);

  const loadTodayWorkout = async () => {
    const today = new Date().toISOString().split("T")[0];
    const workouts = await base44.entities.WorkoutPlan.filter({ date: today, archived: false });
    if (workouts.length === 0) {
      navigate("/");
      return;
    }
    const w = workouts[0];
    setWorkout(w);
    if (w.completed) setDone(true);
    try {
      const data = JSON.parse(w.workout_data || "{}");
      setWorkoutData(data);
      if (w.completed) {
        // Mark all as completed if already done
        setCompletedExercises(new Set(data.exercises?.map((_, i) => i) || []));
      }
    } catch (e) {
      setWorkoutData({});
    }
    setLoading(false);
  };

  const toggleExercise = (idx) => {
    setCompletedExercises(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleFinish = async () => {
    setFinishing(true);
    await base44.entities.WorkoutPlan.update(workout.id, {
      completed: true,
      completed_date: new Date().toISOString(),
      exercises_completed: completedExercises.size,
    });
    setDone(true);
    setFinishing(false);
  };

  const exercises = workoutData?.exercises || [];
  const allDone = exercises.length > 0 && completedExercises.size === exercises.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Workout Complete!</h2>
          <p className="text-muted-foreground mt-2">Great job — {completedExercises.size} of {exercises.length} exercises done.</p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full max-w-xs h-12">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground leading-tight">{workout?.title}</h1>
          <p className="text-sm text-muted-foreground">{workout?.total_duration_minutes} min · {workout?.difficulty_level}</p>
        </div>
      </div>

      {workout?.description && (
        <p className="text-sm text-muted-foreground mb-5 bg-muted/50 rounded-xl p-4">{workout.description}</p>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${exercises.length ? (completedExercises.size / exercises.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {completedExercises.size}/{exercises.length}
        </span>
      </div>

      {/* Warmup */}
      {workoutData?.warmup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-amber-800 text-sm mb-1">🌅 Warmup — {workoutData.warmup.name}</h3>
          <p className="text-xs text-amber-700">{workoutData.warmup.instructions}</p>
          {workoutData.warmup.duration_minutes && (
            <p className="text-xs text-amber-600 mt-1 font-medium">{workoutData.warmup.duration_minutes} min</p>
          )}
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-3 mb-4">
        {exercises.map((ex, idx) => {
          const completed = completedExercises.has(idx);
          const expanded = expandedExercise === idx;
          return (
            <div
              key={idx}
              className={`rounded-xl border-2 transition-all ${completed ? "border-emerald-300 bg-emerald-50" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleExercise(idx)} className="flex-shrink-0">
                  {completed
                    ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    : <Circle className="w-6 h-6 text-muted-foreground" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {ex.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ex.sets && `${ex.sets} sets`}
                    {ex.sets && ex.reps && " · "}
                    {ex.reps && `${ex.reps} reps`}
                    {ex.duration_seconds && `${ex.duration_seconds}s`}
                    {ex.position && ` · ${ex.position}`}
                  </p>
                </div>
                <button onClick={() => setExpandedExercise(expanded ? null : idx)} className="p-1 text-muted-foreground">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                  {ex.description && (
                    <p className="text-sm text-muted-foreground pt-3">{ex.description}</p>
                  )}
                  {ex.instructions && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase mb-1">Instructions</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{ex.instructions}</p>
                    </div>
                  )}
                  {ex.muscles_used && ex.muscles_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ex.muscles_used.map(m => (
                        <span key={m} className="px-2 py-0.5 bg-secondary rounded-full text-xs">{m}</span>
                      ))}
                    </div>
                  )}
                  {ex.safety_notes && (
                    <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
                      <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{ex.safety_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cooldown */}
      {workoutData?.cooldown && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 text-sm mb-1">🧊 Cooldown — {workoutData.cooldown.name}</h3>
          <p className="text-xs text-blue-700">{workoutData.cooldown.instructions}</p>
          {workoutData.cooldown.duration_minutes && (
            <p className="text-xs text-blue-600 mt-1 font-medium">{workoutData.cooldown.duration_minutes} min</p>
          )}
        </div>
      )}

      {/* Finish button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:static md:border-0 md:p-0">
        <Button
          onClick={handleFinish}
          disabled={finishing || completedExercises.size === 0}
          className="w-full h-12 text-base"
        >
          {finishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {allDone ? "Complete Workout ✓" : `Finish (${completedExercises.size}/${exercises.length} done)`}
        </Button>
      </div>
    </div>
  );
}