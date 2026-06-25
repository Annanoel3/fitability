import React, { useState, useEffect } from "react";
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
const TOUR_STEP_LIBRARY = "library";
const TOUR_STEP_PROGRESS = "progress";
const TOUR_STEP_DONE = "done";

const TOUR_ORDER = [TOUR_STEP_WELCOME, TOUR_STEP_COACH, TOUR_STEP_LIBRARY, TOUR_STEP_PROGRESS, TOUR_STEP_DONE];

export default function OnboardingTour({ profile, onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourStep, setTourStep] = useState(TOUR_STEP_WELCOME);

  // When user navigates to the right page, advance the tour
  useEffect(() => {
    if (tourStep === TOUR_STEP_COACH && location.pathname === "/coach") {
      // Give them a moment to land on the page before advancing
      setTimeout(() => setTourStep(TOUR_STEP_LIBRARY), 3500);
    }
    if (tourStep === TOUR_STEP_LIBRARY && location.pathname === "/exercises") {
      setTimeout(() => setTourStep(TOUR_STEP_PROGRESS), 2000);
    }
    if (tourStep === TOUR_STEP_PROGRESS && location.pathname === "/progress") {
      setTimeout(() => completeTour(), 2000);
    }
  }, [location.pathname, tourStep]);

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
      message="Your AI fitness coach remembers your preferences and adjusts workouts going forward. Tap Coach now to meet them!"
      navLabel="Coach"
    />;
  }

  if (tourStep === TOUR_STEP_LIBRARY) {
    return <SpotlightOverlay
      icon={<BookOpen className="w-7 h-7 text-primary" />}
      title="Explore the Library"
      message="Browse every exercise filtered specifically for your abilities. Tap Library to check it out."
      navLabel="Library"
    />;
  }

  if (tourStep === TOUR_STEP_PROGRESS) {
    return <SpotlightOverlay
      icon={<TrendingUp className="w-7 h-7 text-primary" />}
      title="Track Your Progress"
      message="Watch your strength, mobility, and consistency grow over time. Tap Progress to see your dashboard."
      navLabel="Progress"
    />;
  }

  return null;
}

function SpotlightOverlay({ icon, title, message }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5 pointer-events-none">
      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse-scale">
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