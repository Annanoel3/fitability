import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, BookOpen, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tour flow:
// welcome → coach (pulse coach icon, wait for user to tap it)
//   → coach_message (coach sends intro, "Sounds good!" pre-filled, send button pulses)
//   → library (popup + pulse Library icon, wait for tap)
//   → library_exercise (popup + pulse first exercise, wait for tap)
//   → progress (popup + pulse Progress icon, wait for tap)
//   → progress_log (popup + pulse Log button, wait for save)
//   → home_end (auto-navigate home, show final "You're all set!" popup)
//   → done

export default function OnboardingTour({ profile, onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourStep, setTourStep] = useState("welcome");
  const tourStepRef = useRef("welcome");

  const advance = (step) => {
    tourStepRef.current = step;
    setTourStep(step);
    window.fitabilityTourStep = step;
    window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: step } }));
  };

  // When user navigates to the correct page, advance the step
  useEffect(() => {
    if (tourStep === "coach" && location.pathname === "/coach") {
      setTimeout(() => advance("coach_message"), 400);
    }
    if (tourStep === "library" && location.pathname === "/exercises") {
      setTimeout(() => advance("library_exercise"), 400);
    }
    if (tourStep === "progress" && location.pathname === "/progress") {
      setTimeout(() => advance("progress_log"), 400);
    }
  }, [location.pathname, tourStep]);

  // Listen for action events from other pages
  useEffect(() => {
    const handler = (e) => {
      if (e.detail === "coach_message_sent" && tourStepRef.current === "coach_message") {
        advance("library");
      }
      if (e.detail === "first_exercise_clicked" && tourStepRef.current === "library_exercise") {
        advance("progress");
      }
      if (e.detail === "progress_logged" && tourStepRef.current === "progress_log") {
        // Auto-navigate home then show final overlay
        navigate("/");
        setTimeout(() => advance("home_end"), 600);
      }
    };
    window.addEventListener("fitability-tour-action", handler);
    return () => window.removeEventListener("fitability-tour-action", handler);
  }, [navigate]);

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

  if (tourStep === "done") return null;

  // ── WELCOME MODAL ──
  if (tourStep === "welcome") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <div className="bg-card rounded-3xl border border-border w-full max-w-sm p-7 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
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
          <Button className="w-full h-12 text-base gap-2" onClick={() => advance("coach")}>
            Show me around <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── COACH — pulse Coach icon, wait for user to tap ──
  if (tourStep === "coach") {
    return (
      <NavSpotlight
        navLabel="Coach"
        icon={<Bot className="w-7 h-7 text-primary" />}
        title="Meet your Coach"
        message="Your AI fitness coach adjusts your workouts and remembers your conditions. Tap the Coach icon below to meet them!"
      />
    );
  }

  // ── COACH MESSAGE — CoachChat handles the pulsing send button; no overlay here ──
  if (tourStep === "coach_message") {
    return null;
  }

  // ── LIBRARY — pulse Library icon, wait for user to tap ──
  if (tourStep === "library") {
    return (
      <NavSpotlight
        navLabel="Library"
        icon={<BookOpen className="w-7 h-7 text-primary" />}
        title="Explore the Library"
        message="Every exercise here is filtered for your specific abilities and equipment. Tap Library below to explore!"
      />
    );
  }

  // ── LIBRARY EXERCISE — pulse first exercise card, wait for tap ──
  if (tourStep === "library_exercise") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
        <style>{`
          @keyframes exercise-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--primary) / 0.5); }
            50% { transform: scale(1.02); box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
          }
          [data-tour-first-exercise="true"] {
            animation: exercise-pulse 1.5s ease-in-out infinite !important;
            border-color: hsl(var(--primary)) !important;
            pointer-events: auto !important;
          }
        `}</style>
        <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-foreground">Your Exercise Library</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Tap the first exercise below to see its details and modifications.
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
        navLabel="Progress"
        icon={<TrendingUp className="w-7 h-7 text-primary" />}
        title="Track Your Progress"
        message="Watch your strength, mobility, and consistency grow over time. Tap Progress below!"
      />
    );
  }

  // ── PROGRESS LOG — pulse Log Progress button, wait for save ──
  if (tourStep === "progress_log") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center px-5 pb-32">
        <style>{`
          @keyframes button-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--primary) / 0.5); }
            50% { transform: scale(1.05); box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
          }
          [data-tour-log-button="true"] {
            animation: button-pulse 1.5s ease-in-out infinite !important;
            pointer-events: auto !important;
          }
          main, main * {
            pointer-events: auto !important;
          }
        `}</style>
        <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5">
        <div className="bg-card rounded-3xl border border-border w-full max-w-sm p-8 shadow-2xl text-center space-y-5">
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

// Spotlight: dims all nav items except the one the user needs to tap
// AppLayout handles all pointer-events / opacity / pulse via its own <style> block.
// This component just shows the instructional card — it must NOT block the bottom nav.
function NavSpotlight({ icon, title, message }) {
  return (
    <div className="fixed inset-0 z-[99] pointer-events-none flex items-center justify-center px-5 pb-24">
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