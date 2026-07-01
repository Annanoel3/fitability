import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, CheckCircle2, Circle, Shield, ChevronDown, ChevronUp, Trophy, Trash2, Archive, Volume2, VolumeX, Mic, X, Star, SkipForward, Pause, Play, Timer } from "lucide-react";
import { useWorkoutAudio } from "@/hooks/useWorkoutAudio";

export default function WorkoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [workout, setWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [skippedExercises, setSkippedExercises] = useState(new Set());
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exerciseImages, setExerciseImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAudioSetup, setShowAudioSetup] = useState(false);
  const [noisyMode, setNoisyMode] = useState(false);
  const [feedbackState, setFeedbackState] = useState(null); // null | "listening" | "processing" | "review" | "saving" | "saved"
  const [savedRating, setSavedRating] = useState(null);
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewText, setReviewText] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [pendingVoiceCommand, setPendingVoiceCommand] = useState(null); // { label, action, transcript }
  const [pendingSkipIdx, setPendingSkipIdx] = useState(null);
  const pendingTimerRef = useRef(null);
  const [started, setStarted] = useState(false); // timer doesn't run until user taps Start
  const isRestart = location.state?.workout?.completed === true; // came from a completed workout
  const [savedProgress, setSavedProgress] = useState(null); // mid-workout progress from localStorage
  const [userProfile, setUserProfile] = useState(null); // user profile with restriction_tags

  const exercises = workoutData?.exercises || [];

  const handleNext = (currentIdx) => {
    const nextIdx = (currentIdx ?? -1) + 1;
    if (currentIdx != null) setCompletedExercises(prev => { const s = new Set(prev); s.add(currentIdx); return s; });
    if (nextIdx < exercises.length) {
      setExpandedExercise(nextIdx);
      if (audioMode) speakExercise(nextIdx);
    }
  };

  const handleSkip = (currentIdx) => {
    if (currentIdx == null) return;
    // Mark as skipped (not completed), move to next
    setSkippedExercises(prev => { const s = new Set(prev); s.add(currentIdx); return s; });
    setCompletedExercises(prev => { const s = new Set(prev); s.delete(currentIdx); return s; });
    const nextIdx = currentIdx + 1;
    if (nextIdx < exercises.length) {
      setExpandedExercise(nextIdx);
      if (audioMode) speakExercise(nextIdx);
    }
  };

  const handleBack = (currentIdx) => {
    const prevIdx = (currentIdx ?? 1) - 1;
    if (prevIdx >= 0) {
      setExpandedExercise(prevIdx);
      if (audioMode) speakExercise(prevIdx);
    }
  };

  // handleRepeat is defined after the hook — use a ref so the hook can call it safely
  const repeatRef = useRef(null);

  const handleCommandDetected = (cmd) => {
    // Clear any previous pending command
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    if (!cmd) { setPendingVoiceCommand(null); return; }

    setPendingVoiceCommand(cmd);
    // Auto-execute after 3.5 seconds if user doesn't cancel
    pendingTimerRef.current = setTimeout(() => {
      setPendingVoiceCommand(null);
      cmd.action();
    }, 3500);
  };

  const cancelPendingCommand = () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    setPendingVoiceCommand(null);
  };

  const { audioMode, enableAudioMode, disableAudioMode, speakExercise, speakWelcome, speakCommands, speakText, askForFeedback, stopAudio, stopListening, startListening, speaking, listening, listeningForFeedback, voiceSupported, voiceError, lastHeard, dbg } =
    useWorkoutAudio({ exercises, userRestrictions: userProfile?.restriction_tags || [], onNext: handleNext, onSkip: handleSkip, onBack: handleBack, noisyMode, onRepeat: (idx) => repeatRef.current?.(idx), onCommandDetected: handleCommandDetected });

  // Keep ref in sync after speakExercise is available
  repeatRef.current = (idx) => {
    if (idx != null && exercises[idx]) speakExercise(idx);
  };

  useEffect(() => {
    loadTodayWorkout();
    // Load user profile for restriction tags
    base44.entities.UserProfile.filter({}).then(profiles => {
      if (profiles.length > 0) setUserProfile(profiles[0]);
    }).catch(() => {});
    return () => { if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current); };
  }, []);

  // Voice confirmation for skip-to-exercise
  useEffect(() => {
    if (pendingSkipIdx !== null && lastHeard) {
      const lower = lastHeard.toLowerCase();
      if (lower.includes("yes") || lower.includes("yeah") || lower.includes("yep") || lower.includes("sure") || lower.includes("confirm")) {
        const idx = pendingSkipIdx;
        setPendingSkipIdx(null);
        setExpandedExercise(idx);
        if (audioMode) speakExercise(idx);
      } else if (lower.includes("no") || lower.includes("nope") || lower.includes("cancel") || lower.includes("never mind") || lower.includes("nevermind")) {
        setPendingSkipIdx(null);
      }
    }
  }, [lastHeard, pendingSkipIdx, audioMode, speakExercise]);

  // Elapsed timer — only runs after user taps Start, and not while paused
  useEffect(() => {
    if (!started || done || paused) return;
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [started, done, paused]);

  // Save mid-workout progress to localStorage
  useEffect(() => {
    if (!started || !workout?.id || done) return;
    const key = `workout_progress_${workout.id}`;
    localStorage.setItem(key, JSON.stringify({
      completedExercises: [...completedExercises],
      skippedExercises: [...skippedExercises],
      expandedExercise,
      elapsedSeconds,
    }));
  }, [completedExercises, skippedExercises, expandedExercise, elapsedSeconds, started, done, workout?.id]);



  const loadExerciseImages = (exList) => {
    if (!exList || exList.length === 0) return;
    exList.forEach(async (ex, idx) => {
      try {
        const key = ex.name.toLowerCase().trim();
        const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: key });
        if (cached.length > 0) {
          setExerciseImages(prev => ({ ...prev, [idx]: cached[0].image_url }));
        } else {
          setLoadingImages(prev => ({ ...prev, [idx]: true }));
          const { url } = (await base44.functions.invoke('openaiImage', { prompt: `Clean instructional fitness illustration showing a person performing "${ex.name}". Position: ${ex.position || 'standing'}. Simple, clear diagram style, white background, no text.` })).data;
          if (url) {
            setExerciseImages(prev => ({ ...prev, [idx]: url }));
            await base44.entities.ExerciseImage.create({ exercise_name_key: key, image_url: url });
          }
          setLoadingImages(prev => ({ ...prev, [idx]: false }));
        }
      } catch (e) {}
    });
  };

  const loadTodayWorkout = async () => {
    // If Dashboard passed the workout directly via navigation state, use it immediately
    if (location.state?.workout) {
      const w = location.state.workout;
      setWorkout({ ...w, completed: false });
      let exList = [];
      try {
        const data = JSON.parse(w.workout_data || "{}");
        setWorkoutData(data);
        exList = data.exercises || [];
      } catch (e) { setWorkoutData({}); }
      // Check for saved mid-workout progress (only if not a deliberate restart)
      if (!isRestart) {
        const saved = localStorage.getItem(`workout_progress_${w.id}`);
        if (saved) {
          const p = JSON.parse(saved);
          if (p.completedExercises?.length > 0 || p.skippedExercises?.length > 0) {
            setSavedProgress(p);
          }
        }
      }
      setLoading(false);
      loadExerciseImages(exList);
      return;
    }
    // Fallback: fetch from DB (e.g. user navigates directly to /workout)
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
    loadExerciseImages(exList);
  };

  const handleStartAudio = () => {
    setShowAudioSetup(false);
    enableAudioMode();
    speakWelcome(workout?.title || "today's workout").then(() => {
      setTimeout(() => { setExpandedExercise(0); speakExercise(0); }, 5000);
    });
  };

  const toggleExercise = (idx) => {
    setCompletedExercises(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFinish = async () => {
    setFinishing(true);
    stopListening();
    if (workout?.id) localStorage.removeItem(`workout_progress_${workout.id}`);
    // Only count completed (not skipped) exercises
    const trueCompleted = new Set([...completedExercises].filter(i => !skippedExercises.has(i)));
    await base44.entities.WorkoutPlan.update(workout.id, {
      completed: true,
      completed_date: new Date().toISOString(),
      exercises_completed: trueCompleted.size,
    });

    if (audioMode && !noisyMode) {
      // Voice feedback path: listen, then show review screen pre-populated
      setFeedbackState("listening");
      setFinishing(false);
      const transcript = await askForFeedback();

      if (transcript) {
        // Parse voice feedback via openaiChat backend function
        setFeedbackState("processing");
        try {
          const res = await base44.functions.invoke('openaiChat', {
            prompt: `A user just finished a workout and verbally responded to "how did your workout go, rate it 1-5 stars and why?" They said: "${transcript}"\n\nExtract a star rating from 1-5 based on how positive/negative they sound. Also produce a short cleaned-up written summary of their feedback (1-2 sentences).\n\nRating guide: "one star", "terrible", "awful", "hated it" → 1. "two stars", "bad", "not great", "pretty rough" → 2. "okay", "alright", "fine", "three stars", "meh" → 3. "good", "great", "liked it", "four stars" → 4. "amazing", "perfect", "loved it", "five stars", "best ever" → 5. If unclear, use 3.`,
            response_json_schema: {
              type: "object",
              properties: { rating: { type: "number" }, summary: { type: "string" } }
            }
          });
          const parsed = res.data;
          const rating = Math.min(5, Math.max(1, Math.round(parsed.rating || 3)));
          setReviewRating(rating);
          setReviewText(parsed.summary || transcript);
        } catch (e) {
          setReviewText(transcript);
        }
      }
      setFeedbackState("review");
    } else {
      // Text feedback path (noisy mode or voice not supported)
      setReviewRating(3);
      setReviewText("");
      setFeedbackState("review");
      setFinishing(false);
    }
  };

  const handleSaveFeedback = async () => {
    setFeedbackState("saving");
    await base44.entities.WorkoutPlan.update(workout.id, {
      user_rating: reviewRating,
      user_feedback: reviewText,
    });
    setSavedRating(reviewRating);
    setFeedbackState("saved");
    setDone(true);
  };

  const handleSkipFeedback = () => {
    setFeedbackState("saved");
    setDone(true);
  };

  const handleArchive = async () => {
    stopAudio();
    await base44.entities.WorkoutPlan.update(workout.id, { archived: true });
    window.location.href = "/";
  };

  const handleDelete = async () => {
    stopAudio();
    await base44.entities.WorkoutPlan.delete(workout.id);
    window.location.href = "/";
  };

  // User has "reached the end" if they've clicked Next/Done on the last exercise
  const reachedEnd = exercises.length > 0 && (completedExercises.has(exercises.length - 1) || skippedExercises.has(exercises.length - 1));
  const allDone = exercises.length > 0 && completedExercises.size === exercises.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Pre-start screen — shown when workout page first loads
  if (!started && !done) {
    const completedCount = savedProgress?.completedExercises?.length ?? 0;
    const totalCount = exercises.length || workout?.exercises_total || 0;

    const handleContinue = () => {
      setCompletedExercises(new Set(savedProgress.completedExercises));
      setSkippedExercises(new Set(savedProgress.skippedExercises || []));
      setExpandedExercise(savedProgress.expandedExercise ?? null);
      setElapsedSeconds(savedProgress.elapsedSeconds ?? 0);
      setStarted(true);
    };

    const handleStartOver = () => {
      if (workout?.id) localStorage.removeItem(`workout_progress_${workout.id}`);
      setSavedProgress(null);
      setStarted(true);
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4 max-w-sm mx-auto w-full">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Timer className="w-10 h-10 text-primary" />
        </div>
        <div className="w-full">
          <h2 className="text-2xl font-heading font-bold text-foreground">{workout?.title}</h2>
          <p className="text-muted-foreground mt-2">{workout?.total_duration_minutes} min · {workout?.difficulty_level}</p>

          {savedProgress && !isRestart && (
            <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-left">
              <p className="font-semibold text-foreground">⏸ You left off mid-workout</p>
              <p className="text-muted-foreground mt-1">{completedCount} of {totalCount} exercises done — pick up where you left off or start fresh.</p>
            </div>
          )}
          {isRestart && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 text-left">
              <p className="font-semibold">🔄 Restarting this workout</p>
              <p className="mt-1 text-amber-700">You already completed this one today. Your previous progress will be reset.</p>
            </div>
          )}
        </div>

        {savedProgress && !isRestart ? (
          <div className="flex flex-col gap-3 w-full">
            <Button className="w-full h-12 text-base" onClick={handleContinue}>
              Continue Where I Left Off ▶
            </Button>
            <Button variant="outline" className="w-full h-12 text-base" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        ) : (
          <Button className="w-full h-12 text-base" onClick={() => setStarted(true)}>
            {isRestart ? "Restart Workout 🔄" : "Start Workout 💪"}
          </Button>
        )}

        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground">
          Go back
        </button>
      </div>
    );
  }

  if (feedbackState === "review") {
    const isVoicePath = audioMode && !noisyMode;
    return (
      <div className="flex flex-col items-center min-h-[60vh] gap-6 px-4 py-10 max-w-sm mx-auto w-full">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-heading font-bold text-foreground">How did it go?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isVoicePath ? "Here's what I heard — feel free to adjust." : "Rate your workout and leave a note."}
          </p>
        <button
          onClick={() => navigate("/coach")}
          className="text-xs font-medium text-primary hover:underline underline-offset-2 mt-1"
        >
          Too hard or too easy? Tell your Coach to adjust your next workouts →
        </button>
        </div>

        {/* Star rating */}
        <div className="flex gap-2">
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              onClick={() => setReviewRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none"
            >
              <Star className={`w-10 h-10 transition-colors ${s <= (hoverRating || reviewRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>

        {/* Text feedback */}
        <textarea
          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          placeholder="Add a note about how it felt (optional)…"
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
        />

        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1 h-11" onClick={handleSkipFeedback}>Skip</Button>
          <Button className="flex-1 h-11" onClick={handleSaveFeedback} disabled={feedbackState === "saving"}>
            {feedbackState === "saving" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save & Finish
          </Button>
        </div>
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
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 pb-24 md:pb-4">
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
        {/* Adjust-with-Coach reminder + quick path to Coach */}
        <button
          onClick={() => navigate("/coach")}
          className="w-full mb-5 flex items-center justify-center gap-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-xl py-2.5 px-3 transition-colors"
        >
          Too hard or too easy? Tell your Coach — it tunes all your future workouts →
        </button>

      {/* Audio mode status banner */}
      {audioMode && (
        <div className="mb-4 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            {speaking ? (
              <Volume2 className="w-5 h-5 text-primary animate-pulse flex-shrink-0" />
            ) : listening ? (
              <Mic className="w-5 h-5 text-emerald-500 animate-pulse flex-shrink-0" />
            ) : (
              <Volume2 className="w-5 h-5 text-primary flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {speaking ? "Reading instructions…" : noisyMode ? "Audio on — tap buttons to navigate" : listening ? "Listening…" : "Audio coaching on"}
              </p>
            </div>
            <button onClick={disableAudioMode} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          {lastHeard && (
            <p className="text-xs text-muted-foreground">Heard: "<span className="font-medium">{lastHeard}</span>"</p>
          )}
          {voiceError && (
            <p className="text-xs text-destructive font-mono bg-destructive/10 px-2 py-1 rounded">⚠ {voiceError}</p>
          )}
          {dbg && (
            <p className="text-xs text-muted-foreground font-mono">dbg: {dbg}</p>
          )}
          {!noisyMode && !voiceError && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Say:</span>
              {['"next"', '"skip"', '"back"', '"repeat"'].map(cmd => (
                <span key={cmd} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{cmd}</span>
              ))}
              <button onClick={speakCommands} className="text-xs text-primary underline ml-1">hear all commands</button>
            </div>
          )}
        </div>
      )}

      {/* Voice command confirmation banner */}
      {pendingVoiceCommand && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <Mic className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Heard: <span className="font-bold">"{pendingVoiceCommand.label}"</span>
            </p>
            <p className="text-xs text-amber-700">Executing in a moment… say "ignore" or tap Cancel to undo.</p>
          </div>
          <button
            onClick={cancelPendingCommand}
            className="text-xs font-semibold text-amber-700 border border-amber-400 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors flex-shrink-0"
          >
            Cancel
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

      {/* Timer + Progress row */}
      <div className="flex items-center gap-4 mb-5 bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-foreground">
          <Timer className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="text-2xl font-bold font-mono text-primary">{formatTime(elapsedSeconds)}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-semibold text-foreground">{completedExercises.size}/{exercises.length}</span>
          </div>
          <div className="bg-muted rounded-full h-2">
            <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${exercises.length ? (completedExercises.size / exercises.length) * 100 : 0}%` }} />
          </div>
        </div>
        <button
          onClick={() => { setPaused(p => !p); if (audioMode) paused ? null : stopAudio(); }}
          className={`p-2 rounded-full transition-colors ${paused ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          title={paused ? "Resume" : "Pause"}
        >
          {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
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
          const skipped = skippedExercises.has(idx);
          const expanded = expandedExercise === idx;
          return (
            <div key={idx} className={`rounded-xl border-2 transition-all ${skipped ? "border-amber-200 bg-amber-50/50 opacity-60" : completed ? "border-emerald-300 bg-emerald-50" : expanded ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => {
                  if (idx === expandedExercise) {
                    setExpandedExercise(null);
                  } else {
                    setPendingSkipIdx(idx);
                    if (audioMode) speakText("Do you want to skip to this exercise? Say yes to skip, or no to cancel.");
                  }
                }} className="flex-shrink-0">
                  {skipped ? <SkipForward className="w-6 h-6 text-amber-500" /> : completed ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Circle className="w-6 h-6 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${skipped ? "line-through text-amber-600" : completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{ex.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[
                      ex.sets ? `${ex.sets} sets` : null,
                      ex.reps ? `${ex.reps} reps` : ex.duration_seconds ? `${ex.duration_seconds}s` : null,
                      ex.position || null
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => {
                  if (idx === expandedExercise) {
                    setExpandedExercise(null);
                  } else {
                    setPendingSkipIdx(idx);
                    if (audioMode) speakText("Do you want to skip to this exercise? Say yes to skip, or no to cancel.");
                  }
                }} className="p-1 text-muted-foreground">
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

                  {/* Always-visible exercise controls */}
                  <div className="flex gap-2 pt-2">
                    {idx > 0 && (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleBack(idx)}>
                        ← Back
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      onClick={() => handleSkip(idx)}
                      title="Skip this exercise — won't count toward your progress"
                    >
                      <SkipForward className="w-3.5 h-3.5 mr-1" /> Skip
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleNext(idx)}
                    >
                      {idx < exercises.length - 1 ? "Done →" : "Finish ✓"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skip to exercise confirmation modal */}
      {pendingSkipIdx !== null && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 pb-24 md:pb-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-xl p-6 space-y-5">
            <h2 className="font-heading font-bold text-lg">Skip to this exercise?</h2>
            <p className="text-sm text-muted-foreground">{exercises[pendingSkipIdx]?.name}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setPendingSkipIdx(null)}
              >
                No, cancel
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={() => {
                  const idx = pendingSkipIdx;
                  setPendingSkipIdx(null);
                  setExpandedExercise(idx);
                  if (audioMode) speakExercise(idx);
                }}
              >
                Yes, skip
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <Loader2 className="w-4 h-4 animate-spin" /> Processing your feedback…
          </div>
        )}
        <Button
          onClick={handleFinish}
          disabled={finishing || !reachedEnd || feedbackState === "listening" || feedbackState === "processing"}
          className="w-full h-12 text-base"
          title={!reachedEnd ? "Complete all exercises to finish" : undefined}
        >
          {finishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {reachedEnd ? (allDone ? "Complete Workout ✓" : `Finish (${completedExercises.size}/${exercises.length} done)`) : `Complete exercises to finish (${completedExercises.size + skippedExercises.size}/${exercises.length})`}
        </Button>
      </div>
    </div>
  );
}