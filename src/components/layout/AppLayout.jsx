import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/lib/ThemeContext";
import {
  Heart, Home, Dumbbell, BookOpen, TrendingUp,
  Settings, Menu, X, LogOut, Bot, Sun, Moon } from
"lucide-react";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

const NAV_ITEMS = [
{ path: "/", label: "Home", icon: Home },
{ path: "/coach", label: "Coach", icon: Bot },
{ path: "/exercises", label: "Library", icon: BookOpen },
{ path: "/progress", label: "Progress", icon: TrendingUp },
{ path: "/settings", label: "Settings", icon: Settings }];


export default function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tourStep, setTourStep] = useState(window.fitabilityTourStep);
  const [tourProfile, setTourProfile] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const initTour = async () => {
      const profiles = await base44.entities.UserProfile.filter({});
      const onboardingDone = profiles.length > 0 && profiles[0].onboarding_completed === true;
      if (!onboardingDone && !/onboarding/i.test(window.location.pathname)) { window.location.href = "/onboarding"; return; }
      if (profiles.length > 0 && profiles[0].onboarding_completed && profiles[0].onboarding_tour_completed !== true) {
        setTourProfile(profiles[0]);
        setShowTour(true);
      }
    };
    initTour();
  }, []);

  useEffect(() => {
    const handleTourChange = (e) => {
      setTourStep(e.detail.tourStep);
    };
    window.addEventListener("fitability-tour-step-change", handleTourChange);
    return () => window.removeEventListener("fitability-tour-step-change", handleTourChange);
  }, []);


  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-primary" aria-hidden="true" />
            <span className="font-heading font-bold text-xl text-foreground">FitAbility</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              const tourActive = ["coach", "library", "progress", "home_end"].includes(tourStep);
              const isAllowed =
                (item.label === "Coach" && tourStep === "coach") ||
                (item.label === "Library" && tourStep === "library") ||
                (item.label === "Progress" && tourStep === "progress") ||
                (item.label === "Home" && tourStep === "home_end");
              const locked = tourActive && !isAllowed;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={locked ? (e) => e.preventDefault() : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locked ? "opacity-40 cursor-not-allowed" :
                  active ?
                  "bg-primary text-primary-foreground" :
                  "text-muted-foreground hover:text-foreground hover:bg-muted"}`
                  }>
                  
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </Link>);

            })}
            <button
              onClick={toggle}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="ml-1 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}>
              
              {dark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="ml-1 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
              
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
            
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen &&
        <div className="md:hidden border-t border-border bg-card px-4 py-3">
            {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`
                }>
                
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  {item.label}
                </Link>);

          })}
            <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground w-full">
            
              <LogOut className="w-5 h-5" aria-hidden="true" /> Log Out
            </button>
          </div>
        }
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 md:pb-6 py-2">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50" aria-label="Primary">
      <div className="flex items-center justify-between px-1 py-3">
        {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            const isPulsingCoach = item.label === "Coach" && tourStep === "coach";
            const isPulsingLibrary = item.label === "Library" && tourStep === "library";
            const isPulsingProgress = item.label === "Progress" && tourStep === "progress";
            const isPulsingHome = item.label === "Home" && tourStep === "home_end";
            const navTourActive = !!tourStep && tourStep !== "done";
            const navLocked = navTourActive && !(isPulsingCoach || isPulsingLibrary || isPulsingProgress || isPulsingHome);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={navLocked ? (e) => e.preventDefault() : undefined}
                style={navLocked ? { opacity: 0.4 } : undefined}
                data-tour-nav={item.label}
                data-tour-coach-nav={isPulsingCoach ? "true" : undefined}
                data-tour-library-nav={isPulsingLibrary ? "true" : undefined}
                data-tour-progress-nav={isPulsingProgress ? "true" : undefined}
                data-tour-home-nav={isPulsingHome ? "true" : undefined}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-lg text-xs ${
                active ? "text-primary" : "text-muted-foreground"}`
                }>

              <item.icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>);

          })}
      </div>
      </nav>

      {showTour && (
        <OnboardingTour
          profile={tourProfile}
          onComplete={() => setShowTour(false)}
        />
      )}

      {/* Tour pulsing styles for library, progress and home */}
      <style key={tourStep}>{`
        @keyframes icon-pulse {
          0%, 100% { transform: scale(1.06); box-shadow: 0 0 0 0 hsl(var(--primary) / 0.7); }
          50%      { transform: scale(1.14); box-shadow: 0 0 0 16px hsl(var(--primary) / 0); }
        }
        nav a[data-tour-coach-nav],
        nav a[data-tour-library-nav],
        nav a[data-tour-progress-nav],
        nav a[data-tour-home-nav] {
          animation: icon-pulse 1.1s ease-in-out infinite !important;
          background: hsl(var(--primary) / 0.18) !important;
          outline: 3px solid hsl(var(--primary)) !important;
          outline-offset: 2px !important;
          border-radius: 14px !important;
          color: hsl(var(--primary)) !important;
        }
      `}</style>
    </div>);

}