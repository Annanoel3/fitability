import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, BookOpen, TrendingUp, ArrowRight, X, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tour steps after onboarding completes:
// 1. Welcome modal on Home
// 2. "Go to Coach" spotlight, pre-fill message, pulsate send
// 3. "Go to Library" spotlight after message sent
// 4. "Sort exercises" spotlight on Library
// 5. "Go to Progress" spotlight after sorting
// 6. "Log Progress" prompt on Progress page
// 7. "Go Home" spotlight after logging
// 8. Final message on Home

const TOUR_STEP_WELCOME = "welcome";
const TOUR_STEP_COACH = "coach";
const TOUR_STEP_COACH_MESSAGE = "coach_message";
const TOUR_STEP_LIBRARY = "library";
const TOUR_STEP_LIBRARY_SORT = "library_sort";
const TOUR_STEP_PROGRESS = "progress";
const TOUR_STEP_PROGRESS_LOG = "progress_log";
const TOUR_STEP_HOME_FINAL = "home_final";
const TOUR_STEP_DONE = "done";

export default function OnboardingTour({ profile, onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourStep, setTourStep] = useState(TOUR_STEP_WELCOME);

  // Listen for tour progression events
  useEffect(() => {
    const handleCoachMessageSent = () => {
      setTourStep(TOUR_STEP_LIBRARY);
    };
    const handleLibrarySorted = () => {
      setTourStep(TOUR_STEP_PROGRESS);
    };
    const handleProgressLogged = () => {
      setTourStep(TOUR_STEP_HOME_FINAL);
    };

    window.addEventListener("fitability-coach-message-sent", handleCoachMessageSent);
    window.addEventListener("fitability-library-sorted", handleLibrarySorted);
    window.addEventListener("fitability-progress-logged", handleProgressLogged);

    return () => {
      window.removeEventListener("fitability-coach-message-sent", handleCoachMessageSent);
      window.removeEventListener("fitability-library-sorted", handleLibrarySorted);
      window.removeEventListener("fitability-progress-logged", handleProgressLogged);
    };
  }, []);

  // Navigate based on tour step and advance to next step when page loads
  useEffect(() => {
    if (tourStep === TOUR_STEP_COACH && location.pathname !== "/coach") {
      navigate("/coach");
    } else if (tourStep === TOUR_STEP_COACH && location.pathname === "/coach") {
      setTimeout(() => setTourStep(TOUR_STEP_COACH_MESSAGE), 500);
    }
    if (tourStep === TOUR_STEP_LIBRARY && location.pathname !== "/exercises") {
      navigate("/exercises");
    } else if (tourStep === TOUR_STEP_LIBRARY && location.pathname === "/exercises") {
      setTimeout(() => setTourStep(TOUR_STEP_LIBRARY_SORT), 500);
    }
    if (tourStep === TOUR_STEP_PROGRESS && location.pathname !== "/progress") {
      navigate("/progress");
    } else if (tourStep === TOUR_STEP_PROGRESS && location.pathname === "/progress") {
      setTimeout(() => setTourStep(TOUR_STEP_PROGRESS_LOG), 500);
    }
    if (tourStep === TOUR_STEP_HOME_FINAL && location.pathname !== "/") {
      navigate("/");
    }
  }, [tourStep, location.pathname, navigate]);

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
      message="Your AI fitness coach remembers your preferences and adjusts workouts going forward. Tap Coach to chat with them!"
      navLabel="Coach"
    />;
  }

  if (tourStep === TOUR_STEP_COACH_MESSAGE) {
    return <CoachMessagePrompt onSent={() => setTourStep(TOUR_STEP_LIBRARY)} />;
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
    return <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px hsl(var(--primary))); }
          50% { transform: scale(1.5); filter: drop-shadow(0 0 12px hsl(var(--primary))); }
        }
        [data-tour-filter] {
          pointer-events: auto;
        }
        [data-tour-filter] button {
          animation: pulse-scale 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Sort the Exercises</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Click one of the sorting buttons to organize the exercises by name, difficulty, or category.</p>
        </div>
      </div>
    </div>;
  }

  if (tourStep === TOUR_STEP_PROGRESS) {
    return <SpotlightOverlay
      icon={<TrendingUp className="w-7 h-7 text-primary" />}
      title="Track Your Progress"
      message="Log your workouts, pain levels, and improvements over time. Tap Progress to view your dashboard."
      navLabel="Progress"
    />;
  }

  if (tourStep === TOUR_STEP_PROGRESS_LOG) {
    return <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px hsl(var(--primary))); }
          50% { transform: scale(1.5); filter: drop-shadow(0 0 12px hsl(var(--primary))); }
        }
        [data-tour-log-btn] {
          animation: pulse-scale 1.5s ease-in-out infinite !important;
          pointer-events: auto !important;
        }
      `}</style>
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <TrendingUp className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Log Your Progress</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Click the "Log Progress" button to record your workouts, pain levels, weight, and other metrics.</p>
        </div>
      </div>
    </div>;
  }

  if (tourStep === TOUR_STEP_HOME_FINAL && location.pathname === "/") {
    return <HomeEndingMessage onComplete={completeTour} />;
  }

  if (tourStep === TOUR_STEP_HOME_FINAL) {
    return <SpotlightOverlay
      icon={<Home className="w-7 h-7 text-primary" />}
      title="You're All Set!"
      message="You've completed the tour! Head Home to get started."
      navLabel="Home"
    />;
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

function CoachMessagePrompt({ onSent }) {
  const [message, setMessage] = useState("Sounds good!");

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px hsl(var(--primary))); }
          50% { transform: scale(1.5); filter: drop-shadow(0 0 12px hsl(var(--primary))); }
        }
        [data-tour-send-btn] {
          animation: pulse-scale 1.5s ease-in-out infinite;
          pointer-events: auto;
        }
      `}</style>
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Bot className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Send a Message</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">We've pre-written a message for you. Click the pulsing send button to say hello to your Coach!</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-left">
          <p className="text-sm text-foreground italic">"{message}"</p>
        </div>
      </div>
    </div>
  );
}

function HomeEndingMessage({ onComplete }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
      <div className="bg-card rounded-3xl border border-border w-full max-w-sm p-7 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <TrendingUp className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-2xl text-foreground">You're All Set!</h2>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            You've explored Coach, Library, and Progress. Now you're ready to start your fitness journey. Check in daily, complete your personalized workouts, and watch your progress grow.
          </p>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            <strong>Remember:</strong> Your Coach is always here if you have questions or need help. Visit them anytime!
          </p>
        </div>
        <Button className="w-full h-12 text-base" onClick={onComplete}>
          Let's Go!
        </Button>
      </div>
    </div>
  );
}