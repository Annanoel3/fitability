import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bot, BookOpen, TrendingUp, ArrowRight, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared smooth entrance animation injected once
const ANIM_STYLE = `
  @keyframes tour-pop-in {
    0%   { opacity: 0; transform: scale(0.96) translateY(8px); }
    100% { opacity: 1; transform: scale(1)    translateY(0); }
  }
  .tour-card {
    animation: tour-pop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    max-width: 20rem;
    max-height: 68vh;
    overflow-y: auto;
    padding: 0 1.25rem 1.25rem 1.25rem;
    font-size: 0.8125rem;
    line-height: 1.4;
    margin: 0 auto;
    -webkit-overflow-scrolling: touch;
  }
  .tour-card h2 { font-size: 1.125rem; }
  .tour-card h3 { font-size: 1rem; }
  .tour-card .tour-icon {
    width: 3rem; height: 3rem;
  }
  .tour-card .tour-icon span { font-size: 1.5rem; }
  @keyframes tour-fade-in {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  .tour-overlay {
    animation: tour-fade-in 0.25s ease both;
  }
  /* Tour action buttons — soft lavender accent */
  .tour-card button.bg-primary {
    background-color: #c4b5fd !important;
    color: #ffffff !important;
    box-shadow: 0 0 14px 3px rgba(196, 181, 253, 0.45) !important;
    border: none !important;
  }
  .tour-card button.bg-primary:hover {
    background-color: #a78bfa !important;
  }
  .tour-card button.text-muted-foreground {
    color: #c4b5fd !important;
    background: rgba(196, 181, 253, 0.08) !important;
    border-radius: 0.5rem;
  }
  .tour-card button.text-muted-foreground:hover {
    color: #a78bfa !important;
    background: rgba(196, 181, 253, 0.14) !important;
  }
  @keyframes tour-demo-pulse {
    0%, 100% { opacity: 0.45; transform: scale(1); }
    50%      { opacity: 1;    transform: scale(1.08); }
  }
  @keyframes tour-drag-wiggle {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    25%      { transform: translate(2px, -1px) rotate(8deg); }
    50%      { transform: translate(0, 2px) rotate(0deg); }
    75%      { transform: translate(-2px, -1px) rotate(-8deg); }
  }
  .tour-drag-hint {
    animation: tour-drag-wiggle 2s ease-in-out infinite;
    color: #c4b5fd !important;
    background: rgba(196, 181, 253, 0.12) !important;
  }
  .tour-demo-label, .tour-tour-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: hsl(var(--foreground));
    animation: tour-demo-pulse 1.5s ease-in-out infinite;
    padding: 0.2rem 0.5rem;
    margin: 0.625rem auto 0.5rem auto;
    background: rgba(196, 181, 253, 0.18);
    border-radius: 0.375rem;
    width: fit-content;
  }
`;

// Inject the shared tour animation styles once, when this module first loads
if (typeof document !== "undefined" && !document.getElementById("fitability-tour-anim")) {
  const styleEl = document.createElement("style");
  styleEl.id = "fitability-tour-anim";
  styleEl.textContent = ANIM_STYLE;
  document.head.appendChild(styleEl);
}

// ── DRAGGABLE TOUR CARD — shared wrapper for ALL tour popups ──
// Centers every popup in the middle of the screen by default.
// Adds a drag handle (GripVertical icon) in the top-right corner.
//
// DRAG IMPLEMENTATION: window-level touch + mouse listeners (NOT Pointer Events).
// Pointer Events / setPointerCapture do NOT fire reliably inside Capacitor mobile
// WebViews on touch — the touchmove never fires after touchstart.  Instead we:
//   1. onTouchStart / onMouseDown on the handle → set isDragging ref + record start.
//   2. touchmove / mousemove on WINDOW (registered once, passive:false) → update
//      offset.  Window-level listeners fire even when the finger leaves the
//      handle, which is what makes dragging actually work on a phone.
//   3. e.preventDefault() on touchmove stops the WebView from scrolling/zooming.
//   4. touch-action:none on the handle prevents the browser intercepting the
//      gesture before JS runs.
// Buttons inside the card are unaffected — drag only starts from the handle, and
// isDragging stays false for touches that start elsewhere.
// Clamps position so at least 48px of the card stays visible on every edge.
// Resets drag offset when the tour step changes (each popup starts centered).
function DraggableTourCard({ children, tourStep, showDragHint = false }) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const isDragging = useRef(false);
  const cardRef = useRef(null);

  // Reset drag position when step changes — each popup starts centered
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [tourStep]);

  // Window-level move/end listeners — registered once on mount.
  // Using refs (isDragging, dragStart) avoids stale-closure issues.
  useEffect(() => {
    const doMove = (clientX, clientY) => {
      if (!isDragging.current) return;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      let newX = dragStart.current.offsetX + dx;
      let newY = dragStart.current.offsetY + dy;

      const card = cardRef.current;
      if (card) {
        const rect = card.getBoundingClientRect();
        const margin = 48;
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const maxX = window.innerWidth - margin - centerX + halfW;
        const minX = margin - centerX - halfW;
        const maxY = window.innerHeight - margin - centerY + halfH;
        const minY = margin - centerY - halfH;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }
      setDragOffset({ x: newX, y: newY });
    };

    const onTouchMove = (e) => {
      if (!isDragging.current) return;
      e.preventDefault(); // stop the WebView from scrolling/zooming during drag
      const t = e.touches[0];
      doMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => { isDragging.current = false; };
    const onMouseMove = (e) => doMove(e.clientX, e.clientY);
    const onMouseUp = () => { isDragging.current = false; };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startDrag = (clientX, clientY) => {
    isDragging.current = true;
    dragStart.current = {
      x: clientX,
      y: clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
  };

  return (
    <div className="tour-overlay fixed inset-0 z-[100] flex items-center justify-center px-5 pointer-events-none">
      <div
        ref={cardRef}
        className="relative"
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        }}
      >
        {/* Drag handle — top-right corner, pointer-events enabled */}
        <div
          onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startDrag(e.clientX, e.clientY); }}
          className={`absolute top-2 right-2 z-20 p-2 rounded-lg cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground hover:bg-muted/70 transition-colors pointer-events-auto ${showDragHint ? "tour-drag-hint" : ""}`}
          style={{ touchAction: 'none' }}
          aria-label="Drag to move"
        >
          <Move className="w-6 h-6" />
          {showDragHint && (
            <span className="absolute -bottom-1 right-1/2 translate-x-1/2 translate-y-full whitespace-nowrap text-[0.625rem] font-semibold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md">
              drag me ↗
            </span>
          )}
        </div>
        <div className="tour-card bg-card rounded-3xl border border-border shadow-2xl pointer-events-auto">
          <div className="tour-tour-label">DEMO MODE</div>
          {children}
        </div>
      </div>
    </div>
  );
}

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
    if (step === "intro_2" || step === "welcome" || step === "workout") navigate("/");
    // coach prompt: user taps the nav icon (no auto-navigation)
    if (step === "library_exercise") navigate("/exercises");
    if (step === "progress_log") navigate("/progress");
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
      setTimeout(() => advance("progress_log"), 100);
    }
  }, [location.pathname, tourStep]);

  // Listen for tour step changes from other components
  useEffect(() => {
    const stepHandler = (e) => {
      const newStep = e.detail?.tourStep;
      if (newStep !== undefined && newStep !== null && newStep !== tourStepRef.current) {
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
      if (e.detail === "workout_button_clicked" && tourStepRef.current === "workout") {
        advance("workout_picking");
      }
      if (e.detail === "workout_generated" && (tourStepRef.current === "workout" || tourStepRef.current === "workout_picking")) {
        setTimeout(() => advance("coach"), 1500);
      }
      if (e.detail === "coach_message_sent" && tourStepRef.current === "coach_message") {
        advance("library");
      }
      if (e.detail === "first_exercise_clicked" && tourStepRef.current === "library_exercise") {
        // Immediately hide popup, block clicks for 4s so user can read, then move on
        advance("library_exercise_clicked");
        setTimeout(() => {
          if (tourStepRef.current === "library_exercise_clicked") advance("create_exercise");
        }, 2000);
      }
      if (e.detail === "create_exercise_filled" && tourStepRef.current === "create_exercise") {
        advance("progress");
      }
      if (e.detail === "progress_logged" && tourStepRef.current === "progress_log") {
        // Hide popup, navigate home quickly and show final overlay
        advance("navigating_home");
        setTimeout(() => {
          navigate("/");
          setTimeout(() => advance("home_end"), 300);
        }, 500);
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

  // Dim + lock overlay: one light scrim behind every tour popup, at z-45 (below the
  // nav at z-50 and below the popup cards / pulsing targets) so the rest of the page
  // is dimmed and blocked while the highlighted element stays bright and clickable.
  useEffect(() => {
    let el = document.getElementById("tour-backdrop");
    if (!el) {
      el = document.createElement("div");
      el.id = "tour-backdrop";
      el.style.cssText = "position:fixed;inset:0;z-index:45;background:rgba(0,0,0,0);transition:background 0.25s ease;";
      document.body.appendChild(el);
    }
    const hiddenSteps = ["done", "coach_message", "workout_picking", "library_exercise_clicked", "navigating_home", "progress_log"];
    const visible = tourStep && !hiddenSteps.includes(tourStep);
    el.style.background = visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)";
    const allowScroll = tourStep === "library_exercise" || tourStep === "coach" || tourStep === "coach_message";
    el.style.pointerEvents = (visible && !allowScroll) ? "auto" : "none";
    return () => {
      const e = document.getElementById("tour-backdrop");
      if (e) e.remove();
    };
  }, [tourStep, showWorkoutBridge]);

  const completeTour = async () => {
    advance("done");
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, { onboarding_tour_completed: true });
    }
    onComplete();
  };

  if (tourStep === "done" || tourStep === "workout_picking") return null;

  // Demo banner during coach_message step — no popup card, just a clear indicator
  if (tourStep === "coach_message") {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-3 px-4 pointer-events-none">
        <div className="tour-demo-banner" style={{
          background: "rgba(196, 181, 253, 0.2)",
          border: "1px solid #c4b5fd",
          borderRadius: "0.5rem",
          padding: "0.3rem 0.75rem",
          fontSize: "0.6875rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "hsl(var(--foreground))",
          animation: "tour-demo-pulse 1.5s ease-in-out infinite",
        }}>
          DEMO MODE
        </div>
      </div>
    );
  }

  // Bridge overlay shown after workout is generated
  if (tourStep === "workout_generated" || showWorkoutBridge) {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <div className="text-center space-y-3">
          <div className="tour-icon rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <span>🎉</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">Workout is on its way!</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Great job! Your personalized workout is being generated. Next up — meet your AI Coach who can adjust your workouts anytime.
            </p>
          </div>
        </div>
      </DraggableTourCard>
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

  // ── EXPLAINER ── (after "Show me around", before tour steps begin)
  if (tourStep === "intro_2") {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <div className="text-center space-y-4">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span>✨</span>
          </div>
          <div>
            <h2 className="font-heading font-bold text-foreground">You're in the tour</h2>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Just follow the glowing icons — tap wherever they point, and I'll guide you through step by step. Some buttons are paused until the tour's done. When you finish, the app is all yours!
            </p>
          </div>
          <Button className="w-full h-10 gap-2" onClick={() => advance("workout")}>
            Got it, let's go <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DraggableTourCard>
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
      <DraggableTourCard tourStep={tourStep} showDragHint={true}>
        <div className="text-center space-y-4">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto cursor-pointer" onClick={handleEmojiClick}>
            <span>🎉</span>
          </div>
          <div>
            <h2 className="font-heading font-bold text-foreground">Welcome to FitAbility!</h2>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              This is your Home — where you'll check in each day, start your personalized workout, and track your streak. Let's take a quick tour.
            </p>
          </div>
          <div className="space-y-2 text-left bg-muted/50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-foreground">
              <Bot className="w-4 h-4 text-primary flex-shrink-0" />
              <span><strong>Coach</strong> — adjust workouts, ask questions</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
              <span><strong>Library</strong> — browse all safe exercises</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <span><strong>Progress</strong> — see your journey over time</span>
            </div>
          </div>
          <Button className="w-full h-10 gap-2" onClick={() => advance("intro_2")}>
            Show me around <ArrowRight className="w-4 h-4" />
          </Button>
          <button onClick={completeTour} className="w-full text-muted-foreground py-1 hover:text-foreground transition-colors">
            Skip the tour, I'll explore on my own
          </button>
        </div>
      </DraggableTourCard>
    );
  }

  // ── WORKOUT — centered guide, pulsing button below stays clickable ──
  if (tourStep === "workout") {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <style>{`
          @keyframes workout-btn-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(196, 181, 253, 0.5); }
            50%       { transform: scale(1.04); box-shadow: 0 0 16px 4px rgba(196, 181, 253, 0.5); }
          }
          [data-tour-start-workout="true"] {
            animation: workout-btn-pulse 1.2s ease-in-out infinite !important;
            border: 2px solid #c4b5fd !important;
            outline: 2px solid #c4b5fd !important;
            outline-offset: 2px !important;
            pointer-events: auto !important;
            position: relative;
            z-index: 50;
          }
        `}</style>
        <div className="text-center space-y-3">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span>💪</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">Start your first workout!</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Tap the glowing button below to choose your workout type and intensity.
            </p>
          </div>
        </div>
      </DraggableTourCard>
    );
  }

  // ── COACH — pulse Coach icon, wait for user to tap ──
  if (tourStep === "coach") {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <div className="text-center space-y-3">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">Meet your Coach</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Your AI fitness coach adjusts your workouts and remembers your conditions. Tap the Coach icon below to meet them!
            </p>
          </div>
        </div>
      </DraggableTourCard>
    );
  }

  // ── LIBRARY — pulse Library icon, wait for user to tap ──
  if (tourStep === "library") {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <div className="text-center space-y-3">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">Your Exercise Library</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Browse exercises filtered for your abilities, and create your own custom exercises too! Tap Library below to explore.
            </p>
          </div>
        </div>
      </DraggableTourCard>
    );
  }

  // ── LIBRARY EXERCISE — CSS-only pulse, no popup card ──
  if (tourStep === "library_exercise") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center px-5 pb-10">
        <style>{`
          
          @keyframes exercise-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(196, 181, 253, 0.5); }
            50%       { transform: scale(1.04); box-shadow: 0 0 16px 4px rgba(196, 181, 253, 0.5); }
          }
          [data-tour-first-exercise="true"] {
            animation: exercise-pulse 1.5s ease-in-out infinite !important; position: relative !important; z-index: 101 !important;
            border: 2px solid #c4b5fd !important;
            outline: 2px solid #c4b5fd !important;
            outline-offset: 2px !important;
            pointer-events: auto !important;
          }
          main, main * { pointer-events: auto !important; }
        `}</style>
      </div>
    );
  }

  // ── CREATE EXERCISE — CSS-only pulse, no popup card ──
  if (tourStep === "create_exercise") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <style>{`
          @keyframes create-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(196, 181, 253, 0.5); }
            50%      { transform: scale(1.04); box-shadow: 0 0 16px 4px rgba(196, 181, 253, 0.5); }
          }
          [data-tour-create-exercise="true"] {
            animation: create-pulse 1.3s ease-in-out infinite !important; position: relative !important; z-index: 101 !important;
            border: 2px solid #c4b5fd !important;
            outline: 2px solid #c4b5fd !important;
            outline-offset: 2px !important;
            pointer-events: auto !important;
          }
          main, main * { pointer-events: auto !important; }
        `}</style>
      </div>
    );
  }

  // ── PROGRESS — pulse Progress icon, wait for user to tap ──
  if (tourStep === "progress") {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <div className="text-center space-y-3">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">Track your progress</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Last one - tap Progress below to log how things are going.
            </p>
          </div>
        </div>
      </DraggableTourCard>
    );
  }

  // ── PROGRESS LOG — CSS-only pulse, no popup card ──
  if (tourStep === "progress_log") {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center px-5 pb-32">
        <style>{`
          
          @keyframes button-pulse {
            0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(196, 181, 253, 0.5); }
            50%       { transform: scale(1.04); box-shadow: 0 0 16px 4px rgba(196, 181, 253, 0.5); }
          }
          [data-tour-log-button="true"] {
            animation: button-pulse 1.5s ease-in-out infinite !important; position: relative !important; z-index: 101 !important;
            border: 2px solid #c4b5fd !important;
            outline: 2px solid #c4b5fd !important;
            outline-offset: 2px !important;
            pointer-events: auto !important;
          }
          main, main * { pointer-events: auto !important; }
        `}</style>
      </div>
    );
  }

  // ── HOME END — final "You're all set!" modal ──
  if (tourStep === "home_end") {
    return (
      <DraggableTourCard tourStep={tourStep}>
        <div className="text-center space-y-4">
          <div className="tour-icon rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span>🎯</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">You're all set!</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              You now know the essentials. Check in daily, start your workout from Home, and visit your Coach anytime you have questions or need to adjust your plan.
            </p>
          </div>
          <Button className="w-full h-10 gap-2" onClick={completeTour}>
            Let's go! <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DraggableTourCard>
    );
  }

  return null;
}