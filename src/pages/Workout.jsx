import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft, ChevronRight, Check, Clock, Target,
  Loader2, Play, Pause, RotateCcw,
  Shield, Dumbbell, Wind, Archive
} from "lucide-react";

export default function Workout() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    loadWorkout();
  }, []);

  useEffect(() => {
    let interval;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            setTimerActive(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const loadWorkout = async () => {
    const today = new Date().toISOString().split("T")[0];
    const workouts = await base44.entities.WorkoutPlan.filter({ date: today }, "-created_date", 1);
    if (workouts.length === 0) {
      navigate("/");
      return;
    }
    setWorkout(workouts[0]);
    if (workouts[0].workout_data) {
      setWorkoutData(JSON.parse(workouts[0].workout_data));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workoutData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No workout data available.</p>
        <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
      </div>
    );
  }

  const allSteps = [];
  if (workoutData.warmup) {
    allSteps.push({ type: "warmup", data: workoutData.warmup });
  }
  (workoutData.exercises || []).forEach((ex, i) => {
    allSteps.push({ type: "exercise", data: ex, index: i + 1 });
  });
  if (workoutData.cooldown) {
    allSteps.push({ type: "cooldown", data: workoutData.cooldown });
  }

  const step = allSteps[currentStep];
  const progress = ((completedSteps.size) / allSteps.length) * 100;
  const allDone = completedSteps.size === allSteps.length;

  const markComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < allSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const finishWorkout = async () => {
    await base44.entities.WorkoutPlan.update(workout.id, {
      completed: true,
      completed_date: new Date().toISOString(),
      exercises_completed: completedSteps.size
    });
    navigate("/");
  };

  const archiveWorkout = async () => {
    await base44.entities.WorkoutPlan.update(workout.id, { archived: true });
    navigate("/");
  };

  const startTimer = (seconds) => {
    setTimerSeconds(seconds);
    setTimerActive(true);
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="pb-20 md:pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-bold text-lg">{workoutData.title}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {workoutData.total_duration_minutes}m
          </div>
          <button
            onClick={archiveWorkout}
            title="Archive workout"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Progress value={progress} className="mb-6 h-2" />

      {/* Step indicators */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2">
        {allSteps.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              completedSteps.has(i)
                ? "bg-emerald-500 text-white"
                : i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {completedSteps.has(i) ? <Check className="w-4 h-4" /> : i + 1}
          </button>
        ))}
      </div>

      {/* Current Exercise */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Type badge */}
        <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
          step.type === "warmup" ? "bg-amber-50 text-amber-700" :
          step.type === "cooldown" ? "bg-blue-50 text-blue-700" :
          "bg-primary/10 text-primary"
        }`}>
          <div className="flex items-center gap-2">
            {step.type === "warmup" && <Wind className="w-3.5 h-3.5" />}
            {step.type === "exercise" && <Dumbbell className="w-3.5 h-3.5" />}
            {step.type === "cooldown" && <Wind className="w-3.5 h-3.5" />}
            {step.type === "warmup" ? "Warmup" : step.type === "cooldown" ? "Cool Down" : `Exercise ${step.index}`}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">{step.data.name}</h2>
            {step.data.description && (
              <p className="text-muted-foreground mt-2 text-sm">{step.data.description}</p>
            )}
          </div>

          {/* Sets/Reps or Duration */}
          {step.type === "exercise" && (
            <div className="flex gap-4">
              {step.data.sets && (
                <div className="bg-secondary/50 rounded-xl px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-primary">{step.data.sets}</div>
                  <div className="text-xs text-muted-foreground">Sets</div>
                </div>
              )}
              {step.data.reps && (
                <div className="bg-secondary/50 rounded-xl px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-primary">{step.data.reps}</div>
                  <div className="text-xs text-muted-foreground">Reps</div>
                </div>
              )}
              {step.data.duration_seconds && (
                <div className="bg-secondary/50 rounded-xl px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-primary">{step.data.duration_seconds}s</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              )}
            </div>
          )}

          {(step.type === "warmup" || step.type === "cooldown") && step.data.duration_minutes && (
            <div className="bg-secondary/50 rounded-xl px-5 py-3 text-center inline-block">
              <div className="text-2xl font-bold text-primary">{step.data.duration_minutes}</div>
              <div className="text-xs text-muted-foreground">Minutes</div>
            </div>
          )}

          {/* Timer */}
          {(step.data.duration_seconds || step.data.duration_minutes) && (
            <div className="bg-muted rounded-xl p-4 text-center">
              <div className="text-3xl font-mono font-bold text-foreground mb-3">
                {formatTime(timerSeconds)}
              </div>
              <div className="flex gap-2 justify-center">
                {!timerActive ? (
                  <Button
                    size="sm"
                    onClick={() => startTimer(step.data.duration_seconds || (step.data.duration_minutes * 60))}
                  >
                    <Play className="w-4 h-4 mr-1" /> Start Timer
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setTimerActive(false)}>
                    <Pause className="w-4 h-4 mr-1" /> Pause
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTimerActive(false);
                    setTimerSeconds(step.data.duration_seconds || (step.data.duration_minutes * 60));
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {step.data.instructions && (
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-2">Instructions</h4>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {step.data.instructions}
              </div>
            </div>
          )}

          {/* Muscles */}
          {step.data.muscles_used && step.data.muscles_used.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {step.data.muscles_used.map(m => (
                <span key={m} className="px-2.5 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground">
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* Safety */}
          {step.data.safety_notes && (
            <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
              <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">{step.data.safety_notes}</p>
            </div>
          )}

          {/* Position badge */}
          {step.data.position && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-xs font-medium">
              Position: {step.data.position}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {!allDone ? (
          <Button onClick={markComplete} className="flex-1 h-12 text-base">
            {completedSteps.has(currentStep) ? "Completed ✓" : "Mark Complete"}
          </Button>
        ) : (
          <Button onClick={finishWorkout} className="flex-1 h-12 text-base bg-emerald-600 hover:bg-emerald-700">
            Finish Workout 🎉
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.min(allSteps.length - 1, currentStep + 1))}
          disabled={currentStep === allSteps.length - 1}
          className="flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}