import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, BookOpen, TrendingUp, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tour steps after onboarding completes:
// 1. Welcome modal on Home
// 2. "Go to Coach" spotlight (screen locked until they tap Coach)
// 3. "Go to Library" spotlight (after visiting Coach)
// 4. "Go to Progress" spotlight (after visiting Library)

const TOUR_STEP_WELCOME = "welcome";
const TOUR_STEP_COACH = "coach";
const TOUR_STEP_COACH_MESSAGE = "coach_message";
const TOUR_STEP_LIBRARY = "library";
const TOUR_STEP_LIBRARY_SORT = "library_sort";
const TOUR_STEP_PROGRESS = "progress";
const TOUR_STEP_PROGRESS_LOG = "progress_log";
const TOUR_STEP_HOME_END = "home_end";
const TOUR_STEP_DONE = "done";

const TOUR_ORDER = [TOUR_STEP_WELCOME, TOUR_STEP_COACH, TOUR_STEP_COACH_MESSAGE, TOUR_STEP_LIBRARY, TOUR_STEP_LIBRARY_SORT, TOUR_STEP_PROGRESS, TOUR_STEP_PROGRESS_LOG, TOUR_STEP_HOME_END, TOUR_STEP_DONE];

export default function OnboardingTour({ profile, onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourStep, setTourStep] = useState(TOUR_STEP_WELCOME);
  const tourStepRef = useRef(tourStep);
  useEffect(() => { tourStepRef.current = tourStep; }, [tourStep]);

  // Dispatch tour step changes to window so other pages can listen
  useEffect(() => {
    window.fitabilityTourStep = tourStep;
    window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep } }));
  }, [tourStep]);

  // When user navigates to the right page, advance the tour
  useEffect(() => {
    if (tourStep === TOUR_STEP_COACH && location.pathname === "/coach") {
      setTimeout(() => setTourStep(TOUR_STEP_COACH_MESSAGE), 500);
    }
    if (tourStep === TOUR_STEP_LIBRARY && location.pathname === "/exercises") {
      setTimeout(() => setTourStep(TOUR_STEP_LIBRARY_SORT), 500);
    }
    if (tourStep === TOUR_STEP_PROGRESS && location.pathname === "/progress") {
      setTimeout(() => setTourStep(TOUR_STEP_PROGRESS_LOG), 500);
    }
  }, [location.pathname, tourStep]);

  // Listen for CoachChat signaling that the coach message was sent → advance to library
  useEffect(() => {
    const handleExternal = (e) => {
      if (e.detail.tourStep === "library" && tourStepRef.current === TOUR_STEP_COACH_MESSAGE) {
        setTourStep(TOUR_STEP_LIBRARY);
      }
    };
    window.addEventListener("fitability-tour-step-change", handleExternal);
    return () => window.removeEventListener("fitability-tour-step-change", handleExternal);
  }, []);

  const completeTour = async () => {
    setTourStep(TOUR_STEP_DONE);
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, { onboarding_tour_completed: true });
    }
    onComplete();
  };

  if (tourStep === TOUR_STEP_DONE) return null;

  // ── WELCOME MODAL ──
  if (tourStep === TOUR_STEP_WELCOME) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <div className="bg-card rounded-3xl border border-border w-full max-w-sm p-7 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🎉</span>
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl text-foreground">Welcome to FitAbility!</h2>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              This is your Home — where you'll check in each day, start your personalized workout, and track your streak.
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
          <Button className="w-full h-12 text-base gap-2" onClick={() => setTourStep(TOUR_STEP_COACH)}>
            Show me around <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── SPOTLIGHT OVERLAYS — lock screen except the highlighted nav item ──
  if (tourStep === TOUR_STEP_COACH) {
    return <SpotlightOverlay
      icon={<Bot className="w-7 h-7 text-primary" />}
      title="Meet your Coach"
      message="Your AI fitness coach remembers your preferences, adjusts workouts, and can help with any improving or worsening conditions. Tap Coach to meet them!"
      navLabel="Coach"
    />;
  }

  if (tourStep === TOUR_STEP_COACH_MESSAGE) {
    return <CoachMessageOverlay onAdvance={() => setTourStep(TOUR_STEP_LIBRARY)} />;
  }

  if (tourStep === TOUR_STEP_LIBRARY) {
    return <SpotlightOverlay
      icon={<BookOpen className="w-7 h-7 text-primary" />}
      title="Explore the Library"
      message="Browse every exercise filtered specifically for your abilities. Tap Library to explore."
      navLabel="Library"
    />;
  }

  if (tourStep === TOUR_STEP_LIBRARY_SORT) {
    return <SortButtonOverlay onAdvance={() => setTourStep(TOUR_STEP_PROGRESS)} />;
  }


  if (tourStep === TOUR_STEP_PROGRESS) {
    return <SpotlightOverlay
      icon={<TrendingUp className="w-7 h-7 text-primary" />}
      title="Track Your Progress"
      message="Watch your strength, mobility, and consistency grow over time. Tap Progress to see your dashboard."
      navLabel="Progress"
    />;
  }

  if (tourStep === TOUR_STEP_PROGRESS_LOG) {
    return <LogProgressOverlay onAdvance={() => setTourStep(TOUR_STEP_HOME_END)} />;
  }

  if (tourStep === TOUR_STEP_HOME_END) {
    return <HomeEndingOverlay onAdvance={() => completeTour()} />;
  }

  return null;
}

function SpotlightOverlay({ icon, title, message, navLabel }) {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px hsl(var(--primary))); }
          50% { transform: scale(1.5); filter: drop-shadow(0 0 12px hsl(var(--primary))); }
        }
        [data-tour-nav] {
          color: hsl(var(--muted-foreground)) !important;
          pointer-events: none;
        }
        [data-tour-nav="${navLabel}"] {
          color: hsl(var(--primary)) !important;
          pointer-events: auto;
        }
        [data-tour-nav="${navLabel}"] svg {
          animation: pulse-scale 1.5s ease-in-out infinite;
        }
      `}</style>
      
      {/* Centered instruction card - only this is clickable */}
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
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

function CoachMessageOverlay({ onAdvance }) {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes button-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        [data-tour-coach-send] {
          animation: button-pulse 1.5s ease-in-out infinite !important;
          pointer-events: auto;
        }
        [data-tour-coach-input] {
          pointer-events: auto;
        }
        [data-tour-coach-overlay] {
          pointer-events: auto;
        }
      `}</style>
      <div data-tour-coach-overlay className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Bot className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Great! Now say hello</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Send "Sounds good!" to confirm you're ready to start.
          </p>
        </div>
      </div>
    </div>
  );
}

function SortButtonOverlay({ onAdvance }) {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes button-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        [data-tour-sort-button] {
          animation: button-pulse 1.5s ease-in-out infinite !important;
          pointer-events: auto;
        }
      `}</style>
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Your Exercise Library</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Browse exercises filtered for your specific abilities. Use the dropdowns to sort and filter by category, position, or difficulty.
          </p>
        </div>
        <Button className="w-full h-11 gap-2" onClick={onAdvance}>
          Next <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function LogProgressOverlay({ onAdvance }) {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes button-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        [data-tour-log-button] {
          animation: button-pulse 1.5s ease-in-out infinite !important;
          pointer-events: auto;
        }
      `}</style>
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <TrendingUp className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Log your progress</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Tap "Log Progress" to record your activity, mood, energy, and pain levels so we can track your journey.
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeEndingOverlay({ onAdvance }) {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <div className="bg-card rounded-3xl border border-border w-full max-w-sm p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">🎯</span>
        </div>
        <div>
          <h3 className="font-heading font-bold text-xl text-foreground">You're all set!</h3>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            You now know all the essentials. Check in daily, adjust with your Coach, and track your progress over time. For any questions, just visit Coach anytime.
          </p>
        </div>
        <Button className="w-full h-12 text-base" onClick={onAdvance}>
          Let's go! <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}