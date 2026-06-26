import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, BookOpen, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared smooth entrance animation injected once
const ANIM_STYLE = `
  @keyframes tour-pop-in {
    0%   { opacity: 0; transform: scale(0.88) translateY(12px); }
    100% { opacity: 1; transform: scale(1)    translateY(0); }
  }
  .tour-card {
    animation: tour-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes tour-fade-in {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  .tour-overlay {
    animation: tour-fade-in 0.25s ease both;
  }
`;

export default function OnboardingTour({ profile, onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourStep, setTourStep] = useState("welcome");
  const [showWorkoutBridge, setShowWorkoutBridge] = useState(false);
  const [emojiClickCount, setEmojiClickCount] = useState(0);
  const tourStepRef = useRef("welcome");

  const advance = (step) => {
    tourStepRef.current = step;
    setTourStep(step);
    window.fitabilityTourStep = step;
    window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: step } }));
    // Ensure user is on the correct page for each step
    if (step === "welcome" || step === "workout") navigate("/");
    if (step === "coach") navigate("/coach");
    if (step === "library" || step === "library_exercise") navigate("/exercises");
    if (step === "progress" || step === "progress_log") navigate("/progress");
    if (step === "home_end") navigate("/");
  };

  // When user navigates to the correct page, advance the step
  useEffect(() => {
    if (tourStep === "coach" && location.pathname === "/coach") {
      setTimeout(() => advance("coach_message"), 400);
    }
    if (tourStep === "workout" && location.pathname === "/") {
      // ensure we're on home when this step shows
    }
    if (tourStep === "library" && location.pathname === "/exercises") {
      setTimeout(() => advance("library_exercise"), 400);
    }
    if (tourStep === "progress" && location.pathname === "/progress") {
      setTimeout(() => advance("progress_log"), 400);
    }
  }, [location.pathname, tourStep]);

  // Listen for tour step changes and apply them immediately
  useEffect(() => {
    const stepHandler = (e) => {
      const newStep = e.detail?.tourStep;
      if (newStep !== undefined && newStep !== null) {
        tourStepRef.current = newStep;
        setTourStep(newStep);
      }
    };
    window.addEventListener("fitability-tour-step-change", stepHandler);
    return () => window.removeEventListener("fitability-tour-step-change", stepHandler);
  }, []);

  // Listen for tour step changes from other components
  useEffect(() => {
    const stepHandler = (e) => {
      const newStep = e.detail?.tourStep;
      if (newStep) {
        tourStepRef.current = newStep;
        setTourStep(newStep);
      }
    };
    window.addEventListener("fitability-tour-step-change", stepHandler);
    return () => window.removeEventListener("fitability-tour-step-change", stepHandler);
  }, []);

  // Listen for action events from other pages
  useEffect(() => {
    const handler = (e) => {
      if (e.detail === "workout_generated" && (tourStepRef.current === "workout" || tourStepRef.current === "workout_picking")) {
        advance("workout_generated");
        setShowWorkoutBridge(true);
        setTimeout(() => {
          setShowWorkoutBridge(false);
          advance("coach");
        }, 4000);
      }
      if (e.detail === "coach_message_sent" && tourStepRef.current === "coach_message") {
        advance("library");
      }
      if (e.detail === "first_exercise_clicked" && tourStepRef.current === "library_exercise") {
        // Immediately hide popup, block clicks for 4s so user can read, then move on
        advance("library_exercise_clicked");
        setTimeout(() => {
          if (tourStepRef.current === "library_exercise_clicked") advance("progress");
        }, 4000);
      }
      if (e.detail === "progress_logged" && tourStepRef.current === "progress_log") {
        // Immediately hide popup, block clicks for 4s, then navigate home and show final overlay
        advance("navigating_home");
        setTimeout(() => {
          navigate("/");
          setTimeout(() => advance("home_end"), 600);
        }, 4000);
      }
    };
    window.addEventListener("fitability-tour-action", handler);
    return () => window.removeEventListener("fitability-tour-action", handler);
  }, [navigate]);

  // Listen for tour step changes from Dashboard (when picker opens, etc.)
  useEffect(() => {
    const stepHandler = (e) => {
      const newStep = e.detail?.tourStep;
      if (newStep) {
        tourStepRef.current = newStep;
        setTourStep(newStep);
      }
    };
    window.addEventListener("fitability-tour-step-change", stepHandler);
    return () => window.removeEventListener("fitability-tour-step-change", stepHandler);
  }, []);

  // Broadcast initial step on mount
  useEffect(() => {
    window.fitabilityTourStep = "welcome";
    window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "welcome" } }));
  }, []);

  const completeTour = async () => {
    advance("done");
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, { onboarding_tour_completed: true });
    }
    onComplete();
  };

  if (tourStep === "done" || tourStep === "coach_message" || tourStep === "workout_picking") return null;

  // Bridge overlay shown after workout is generated — block clicks, show message
  if (tourStep === "workout_generated" || showWorkoutBridge) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <style>{ANIM_STYLE}</style>
        <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-sm p-7 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <span className="text-3xl">🎉</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-foreground">Workout is on its way!</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Great job! Your personalized workout is being generated. Next up — meet your AI Coach who can adjust your workouts anytime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // During transition delays — allow scroll but block all taps/clicks
  if (tourStep === "library_exercise_clicked" || tourStep === "navigating_home") {
    return (
      <div
        className="fixed inset-0 z-[100]"
        style={{ pointerEvents: "auto", touchAction: "pan-y", userSelect: "none", background: "transparent" }}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      />
    );
  }

  // ── WELCOME MODAL ──
  if (tourStep === "welcome") {
    const handleEmojiClick = () => {
      const newCount = emojiClickCount + 1;
      setEmojiClickCount(newCount);
      if (newCount >= 7) {
        setTourStep("done");
      }
    };

    return (
      <div className="tour-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <style>{ANIM_STYLE}</style>
        <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-sm p-7 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto cursor-pointer" onClick={handleEmojiClick}>
            <span className="text-3xl">🎉</span>
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl text-foreground">Welcome to FitAbility!</h2>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              This is your Home — where you'll check in each day, start your personalized workout, and track your streak. Let's take a quick tour.
            </p>
          </div>
          <div className="space-y-2 text-left bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <Bot className="w-5 h-5 text-primary flex-shrink-0" />
              <span><strong>Coach</strong> — adjust workouts, ask questions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
              <span><strong>Library</strong> — browse all safe exercises</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
              <span><strong>Progress</strong> — see your journey over time</span>
            </div>
          </div>
          <Button className="w-full h-12 text-base gap-2" onClick={() => advance("workout")}>
            Show me around <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── WORKOUT — overlay modal with dark backdrop, pulsing button ──
  if (tourStep === "workout") {
    return (
      <div className="tour-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <style>{`
          ${ANIM_STYLE}
          @keyframes workout-btn-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   hsl(var(--primary) / 0.5); }
            50%       { transform: scale(1.04); box-shadow: 0 0 0 12px hsl(var(--primary) / 0); }
          }
          [data-tour-start-workout="true"] {
            animation: workout-btn-pulse 1.4s ease-in-out infinite !important;
            outline: 3px solid hsl(var(--primary)) !important;
            outline-offset: 3px !important;
            pointer-events: auto !important;
            position: relative;
            z-index: 101;
          }
        `}</style>
        <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-sm p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">💪</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-foreground">Start your first workout!</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Tap the glowing button above to choose your workout type and intensity.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">The button is highlighted at the top of the screen.</p>
        </div>
      </div>
    );
  }

  // ── COACH — pulse Coach icon, wait for user to tap ──
  if (tourStep === "coach") {
    return (
      <NavSpotlight
        icon={<Bot className="w-7 h-7 text-primary" />}
        title="Meet your Coach"
        message="Your AI fitness coach adjusts your workouts and remembers your conditions. Tap the Coach icon below to meet them!"
      />
    );
  }

  // ── LIBRARY — pulse Library icon, wait for user to tap ──
  if (tourStep === "library") {
    return (
      <NavSpotlight
        icon={<BookOpen className="w-7 h-7 text-primary" />}
        title="Your Exercise Library"
        message="Browse exercises filtered for your abilities, and create your own custom exercises too! Tap Library below to explore."
      />
    );
  }

  // ── LIBRARY EXERCISE — popup at top, pulse first exercise, disappears on tap ──
  if (tourStep === "library_exercise") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center px-5 pt-20">
        <style>{`
          ${ANIM_STYLE}
          @keyframes exercise-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   hsl(var(--primary) / 0.35); }
            50%       { transform: scale(1.06); box-shadow: 0 0 0 14px hsl(var(--primary) / 0); }
          }
          [data-tour-first-exercise="true"] {
            animation: exercise-pulse 1.5s ease-in-out infinite !important;
            border-color: hsl(var(--primary)) !important;
            pointer-events: auto !important;
          }
          main, main * { pointer-events: auto !important; }
        `}</style>
        <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-xs p-6 shadow-2xl text-center space-y-3 pointer-events-auto">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-foreground">Your Exercise Library</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Scroll down and tap the first exercise to see its details and modifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── PROGRESS — pulse Progress icon, wait for user to tap ──
  if (tourStep === "progress") {
    return (
      <NavSpotlight
        icon={<TrendingUp className="w-7 h-7 text-primary" />}
        title="Track Your Progress"
        message="Watch your strength, mobility, and consistency grow over time. Tap Progress below!"
      />
    );
  }

  // ── PROGRESS LOG — popup, disappears immediately when user saves ──
  if (tourStep === "progress_log") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center px-5 pb-32">
        <style>{`
          ${ANIM_STYLE}
          @keyframes button-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   hsl(var(--primary) / 0.5); }
            50%       { transform: scale(1.05); box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
          }
          [data-tour-log-button="true"] {
            animation: button-pulse 1.5s ease-in-out infinite !important;
            pointer-events: auto !important;
          }
          main, main * { pointer-events: auto !important; }
        `}</style>
        <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-foreground">Log your progress</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Tap "Log Progress" to record your activity and how you're feeling today.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── HOME END — final "You're all set!" modal ──
  if (tourStep === "home_end") {
    return (
      <div className="tour-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <style>{ANIM_STYLE}</style>
        <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-sm p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🎯</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-foreground">You're all set!</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              You now know the essentials. Check in daily, start your workout from Home, and visit your Coach anytime you have questions or need to adjust your plan.
            </p>
          </div>
          <Button className="w-full h-12 text-base gap-2" onClick={completeTour}>
            Let's go! <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function NavSpotlight({ icon, title, message }) {
  return (
    <div className="fixed inset-0 z-[99] pointer-events-none flex items-center justify-center px-5 pb-24">
      <style>{ANIM_STYLE}</style>
      <div className="tour-card bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          {icon}
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}