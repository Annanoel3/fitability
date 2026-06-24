import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, CheckCircle2, Circle, Shield, ChevronDown, ChevronUp, Trophy, Trash2, Archive, Volume2, VolumeX, Mic, X, Star } from "lucide-react";
import { useWorkoutAudio } from "@/hooks/useWorkoutAudio";

export default function WorkoutPage() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [exerciseImages, setExerciseImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAudioSetup, setShowAudioSetup] = useState(false);
  const [noisyMode, setNoisyMode] = useState(false);
  const [feedbackState, setFeedbackState] = useState(null); // null | "listening" | "processing" | "saved"
  const [savedRating, setSavedRating] = useState(null);

  const exercises = workoutData?.exercises || [];

  const handleNext = (currentIdx) => {
    const nextIdx = (currentIdx ?? -1) + 1;
    if (nextIdx < exercises.length) {
      setCompletedExercises(prev => { const s = new Set(prev); if (currentIdx != null) s.add(currentIdx); return s; });
      setExpandedExercise(nextIdx);
    }
  };

  const handleBack = (currentIdx) => {
    const prevIdx = (currentIdx ?? 1) - 1;
    if (prevIdx >= 0) {
      setExpandedExercise(prevIdx);
    }
  };

  const { audioMode, enableAudioMode, disableAudioMode, speakExercise, speakWelcome, askForFeedback, stopAudio, stopListening, speaking, listeningForVoice, listeningForFeedback, voiceSupported } =
    useWorkoutAudio({ exercises, onNext: handleNext, onBack: handleBack, noisyMode });

  useEffect(() => {
    loadTodayWorkout();
  }, []);

  // Auto-speak when expanded exercise changes (audio mode only)
  useEffect(() => {
    if (audioMode && expandedExercise !== null) {
      speakExercise(expandedExercise);
    }
  }, [audioMode, expandedExercise]);

  const loadTodayWorkout = async () => {
    const today = new Date().toISOString().split("T")[0];
    const workouts = await base44.entities.WorkoutPlan.filter({ date: today, archived: false });
    if (workouts.length === 0) { navigate("/"); return; }
    const w = workouts[0];
    setWorkout(w);
    if (w.completed) setDone(true);
    let exList = [];
    try {
      const data = JSON.parse(w.workout_data || "{}");
      setWorkoutData(data);
      exList = data.exercises || [];
      if (w.completed) setCompletedExercises(new Set(exList.map((_, i) => i)));
    } catch (e) { setWorkoutData({}); }
    setLoading(false);

    if (exList.length > 0) {
      exList.forEach(async (ex, idx) => {
        try {
          const key = ex.name.toLowerCase().trim();
          const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: key });
          if (cached.length > 0) {
            setExerciseImages(prev => ({ ...prev, [idx]: cached[0].image_url }));
          } else {
            setLoadingImages(prev => ({ ...prev, [idx]: true }));
            const { url } = await base44.integrations.Core.GenerateImage({
              prompt: `Clean instructional fitness illustration showing a person performing "${ex.name}". Position: ${ex.position || "standing"}. ${ex.muscles_used?.length ? "Muscles worked: " + ex.muscles_used.slice(0, 3).join(", ") + "." : ""} Simple, clear diagram style, white background, no text.`
            });
            setExerciseImages(prev => ({ ...prev, [idx]: url }));
            await base44.entities.ExerciseImage.create({ exercise_name_key: key, image_url: url });
            setLoadingImages(prev => ({ ...prev, [idx]: false }));
          }
        } catch (e) {}
      });
    }
  };

  const handleStartAudio = () => {
    setShowAudioSetup(false);
    enableAudioMode();
    speakWelcome(workout?.title || "today's workout");
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
    stopListening(); // stop nav listening before feedback flow
    await base44.entities.WorkoutPlan.update(workout.id, {
      completed: true,
      completed_date: new Date().toISOString(),
      exercises_completed: completedExercises.size,
    });

    if (audioMode) {
      // Ask for voice feedback
      setFeedbackState("listening");
      setFinishing(false);
      const transcript = await askForFeedback();

      if (transcript) {
        setFeedbackState("processing");
        try {
          const parsed = await base44.integrations.Core.InvokeLLM({
            prompt: `A user just finished a workout and said: "${transcript}"\n\nExtract a star rating from 1-5 based on how positive they sound. Also extract a short cleaned-up summary of their feedback (1-2 sentences max).\n\nIf they say "one star", "terrible", "awful" → 1. "two stars", "bad", "not great" → 2. "okay", "alright", "fine", "three stars" → 3. "good", "great", "four stars" → 4. "amazing", "perfect", "loved it", "five stars" → 5. If unclear, use 3.`,
            response_json_schema: {
              type: "object",
              properties: {
                rating: { type: "number" },
                summary: { type: "string" }
              }
            }
          });
          const rating = Math.min(5, Math.max(1, Math.round(parsed.rating || 3)));
          await base44.entities.WorkoutPlan.update(workout.id, {
            user_rating: rating,
            user_feedback: parsed.summary || transcript,
          });
          setSavedRating(rating);
        } catch (e) {}
      }
      setFeedbackState("saved");
    }

    setDone(true);
    setFinishing(false);
  };

  const handleArchive = async () => {
    stopAudio();
    await base44.entities.WorkoutPlan.update(workout.id, { archived: true });
    navigate("/");
  };

  const handleDelete = async () => {
    stopAudio();
    await base44.entities.WorkoutPlan.delete(workout.id);
    navigate("/");
  };

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
        {savedRating && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">You rated this workout</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-7 h-7 ${s <= savedRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
              ))}
            </div>
          </div>
        )}
        <Button onClick={() => navigate("/")} className="w-full max-w-xs h-12">Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-8">

      {/* Audio Setup Modal */}
      {showAudioSetup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-heading font-bold text-lg">Audio Coaching</h2>
              </div>
              <button onClick={() => setShowAudioSetup(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              I'll read each exercise's instructions out loud as you go. {voiceSupported ? 'Say "next", "done", or "back" to navigate hands-free.' : 'Use the on-screen buttons to navigate.'}
            </p>

            {voiceSupported && (
              <button
                onClick={() => setNoisyMode(v => !v)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/40 transition-colors text-left"
              >
                <div className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${noisyMode ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                  {noisyMode && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">I'm in a noisy environment</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Turn off voice commands — I'll tap the button to move on instead.</p>
                </div>
              </button>
            )}

            <Button onClick={handleStartAudio} className="w-full h-12">
              Start Audio Coaching 🎧
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-heading font-bold text-foreground leading-tight">{workout?.title}</h1>
          <p className="text-sm text-muted-foreground">{workout?.total_duration_minutes} min · {workout?.difficulty_level}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => audioMode ? disableAudioMode() : setShowAudioSetup(true)}
            title={audioMode ? "Turn off audio coaching" : "Turn on audio coaching"}
            className={`p-2 rounded-full transition-colors ${audioMode ? "bg-primary/15 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {audioMode ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button onClick={handleArchive} title="Save to archive" className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Archive className="w-5 h-5" />
          </button>
          <button onClick={() => setConfirmDelete(true)} title="Delete workout" className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Audio mode status banner */}
      {audioMode && (
        <div className="mb-4 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
          {speaking ? (
            <Volume2 className="w-5 h-5 text-primary animate-pulse flex-shrink-0" />
          ) : listeningForVoice ? (
            <Mic className="w-5 h-5 text-primary animate-pulse flex-shrink-0" />
          ) : (
            <Volume2 className="w-5 h-5 text-primary flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {speaking ? "Reading instructions…" : noisyMode ? "Audio coaching on — tap Next to advance" : listeningForVoice ? 'Listening — say "next", "done", or "back"' : "Audio coaching on"}
            </p>
          </div>
          <button onClick={disableAudioMode} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-destructive">Delete this workout? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} className="flex-1">Yes, delete</Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      )}

      {workout?.description && (
        <p className="text-sm text-muted-foreground mb-5 bg-muted/50 rounded-xl p-4">{workout.description}</p>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${exercises.length ? (completedExercises.size / exercises.length) * 100 : 0}%` }} />
        </div>
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">{completedExercises.size}/{exercises.length}</span>
      </div>

      {/* Warmup */}
      {workoutData?.warmup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-amber-800 text-sm mb-1">🌅 Warmup — {workoutData.warmup.name}</h3>
          <p className="text-xs text-amber-700">{workoutData.warmup.instructions}</p>
          {workoutData.warmup.duration_minutes && <p className="text-xs text-amber-600 mt-1 font-medium">{workoutData.warmup.duration_minutes} min</p>}
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-3 mb-4">
        {exercises.map((ex, idx) => {
          const completed = completedExercises.has(idx);
          const expanded = expandedExercise === idx;
          return (
            <div key={idx} className={`rounded-xl border-2 transition-all ${completed ? "border-emerald-300 bg-emerald-50" : expanded && audioMode ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleExercise(idx)} className="flex-shrink-0">
                  {completed ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Circle className="w-6 h-6 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{ex.name}</p>
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
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-muted flex items-center justify-center mt-3">
                    {loadingImages[idx] ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Generating image...</span>
                      </div>
                    ) : exerciseImages[idx] ? (
                      <img src={exerciseImages[idx]} alt={ex.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>

                  {audioMode && speaking && expandedExercise === idx && (
                    <div className="flex items-center gap-2 text-primary text-xs font-medium">
                      <Volume2 className="w-4 h-4 animate-pulse" /> Reading instructions…
                    </div>
                  )}

                  {ex.description && <p className="text-sm text-muted-foreground">{ex.description}</p>}
                  {ex.instructions && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase mb-1">Instructions</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{ex.instructions}</p>
                    </div>
                  )}
                  {ex.muscles_used && ex.muscles_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ex.muscles_used.map(m => <span key={m} className="px-2 py-0.5 bg-secondary rounded-full text-xs">{m}</span>)}
                    </div>
                  )}
                  {ex.safety_notes && (
                    <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
                      <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{ex.safety_notes}</p>
                    </div>
                  )}

                  {/* Audio nav buttons */}
                  {audioMode && (
                    <div className="flex gap-2 pt-1">
                      {idx > 0 && (
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleBack(idx)}>
                          ← Back
                        </Button>
                      )}
                      {idx < exercises.length - 1 && (
                        <Button size="sm" className="flex-1" onClick={() => handleNext(idx)}>
                          Next →
                        </Button>
                      )}
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
          {workoutData.cooldown.duration_minutes && <p className="text-xs text-blue-600 mt-1 font-medium">{workoutData.cooldown.duration_minutes} min</p>}
        </div>
      )}

      {/* Finish button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:static md:border-0 md:p-0">
        {feedbackState === "listening" && (
          <div className="flex items-center justify-center gap-2 mb-3 text-primary text-sm font-medium">
            <Mic className="w-4 h-4 animate-pulse" />
            {listeningForFeedback ? "Listening for your feedback…" : "Getting ready…"}
          </div>
        )}
        {feedbackState === "processing" && (
          <div className="flex items-center justify-center gap-2 mb-3 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Saving your feedback…
          </div>
        )}
        <Button
          onClick={handleFinish}
          disabled={finishing || completedExercises.size === 0 || feedbackState === "listening" || feedbackState === "processing"}
          className="w-full h-12 text-base"
        >
          {finishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {allDone ? "Complete Workout ✓" : `Finish (${completedExercises.size}/${exercises.length} done)`}
        </Button>
      </div>
    </div>
  );
}