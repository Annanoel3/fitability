import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Heart, Lightbulb } from "lucide-react";
import StepBasicInfo from "@/components/onboarding/StepBasicInfo";
import StepGoals from "@/components/onboarding/StepGoals";
import StepActivityLevel from "@/components/onboarding/StepActivityLevel";
import StepBodyMap from "@/components/onboarding/StepBodyMap";
import StepZoneConditions from "@/components/onboarding/StepZoneConditions";

import StepAbilities from "@/components/onboarding/StepAbilities";
import StepRiskFactors from "@/components/onboarding/StepRiskFactors";
import StepVeteran from "@/components/onboarding/StepVeteran";

const STEPS = [
  { key: "veteran", label: "Veteran", component: StepVeteran },
  { key: "basic", label: "About You", component: StepBasicInfo },
  { key: "goals", label: "Goals", component: StepGoals },
  { key: "activity", label: "Activity", component: StepActivityLevel },
  { key: "disabilities", label: "Body Map", component: StepBodyMap },
  { key: "limitations", label: "Conditions", component: StepZoneConditions },
  { key: "abilities", label: "Abilities", component: StepAbilities },
  { key: "risk", label: "Risk Factors", component: StepRiskFactors },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [existingProfileId, setExistingProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedStep, setSavedStep] = useState(null); // non-null = show resume prompt

  // Load any saved onboarding progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const profiles = await base44.entities.UserProfile.filter({});
      if (profiles.length > 0) {
        const profile = profiles[0];
        // If already completed, go to dashboard
        if (profile.onboarding_completed) {
          navigate("/");
          return;
        }
        setExistingProfileId(profile.id);
        // Restore saved step and data — but show resume prompt at step 0
        const savedStep = profile.onboarding_step || 0;
        setStep(0);
        setSavedStep(Math.min(savedStep, STEPS.length - 1));
        // Restore fields back into onboarding data state
        const heightFt = profile.height_inches ? Math.floor(profile.height_inches / 12) : undefined;
        const heightIn = profile.height_inches ? profile.height_inches % 12 : undefined;
        setData({
          display_name: profile.display_name,
          age: profile.age,
          sex: profile.sex,
          height_ft: heightFt,
          height_in: heightIn,
          weight_lbs: profile.weight_lbs,
          goals: profile.goals,
          activity_level: profile.activity_level,
          disabilities: profile.disabilities,
          body_limitations: profile.body_limitations,
          pain_areas: profile.pain_areas,
          current_abilities: profile.current_abilities,
          risk_factors: profile.risk_factors,
          is_veteran: profile.is_veteran,
          veteran_details: profile.veteran_details,
          fitness_mode: profile.fitness_mode,
        });
      }
      setLoading(false);
    };
    loadProgress();
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;
  const StepComponent = STEPS[step].component;

  const handleChange = (updates) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    if (step === 0) return data.is_veteran !== undefined;
    if (step === 1) return data.display_name && data.age;
    if (step === 2) return (data.goals || []).length > 0;
    if (step === 3) return !!data.activity_level;
    return true;
  };

  // Save progress whenever step advances
  const saveProgress = async (nextStep, currentData) => {
    const heightInches = ((currentData.height_ft || 0) * 12) + (currentData.height_in || 0);
    const partial = {
      display_name: currentData.display_name || "User",
      age: currentData.age,
      sex: currentData.sex,
      height_inches: heightInches || undefined,
      weight_lbs: currentData.weight_lbs,
      goals: currentData.goals || [],
      activity_level: currentData.activity_level,
      disabilities: currentData.disabilities || [],
      pain_areas: currentData.pain_areas || {},
      current_abilities: currentData.current_abilities || {},
      risk_factors: currentData.risk_factors || [],
      is_veteran: currentData.is_veteran || false,
      veteran_details: currentData.veteran_details || {},
      onboarding_completed: false,
      onboarding_step: nextStep,
    };
    if (existingProfileId) {
      await base44.entities.UserProfile.update(existingProfileId, partial);
    } else {
      const created = await base44.entities.UserProfile.create(partial);
      setExistingProfileId(created.id);
    }
  };

  const handleNext = async () => {
    const next = step + 1;
    await saveProgress(next, data);
    setStep(next);
  };

  const handleFinish = async () => {
    setSaving(true);
    const heightInches = ((data.height_ft || 0) * 12) + (data.height_in || 0);
    
    let fitnessMode = "Standard";
    if (data.activity_level === "Wheelchair user" || (data.body_limitations || []).includes("Uses wheelchair")) {
      fitnessMode = "Wheelchair";
    } else if (data.activity_level === "Mostly seated" || (data.body_limitations || []).includes("Cannot stand at all")) {
      fitnessMode = "Chair";
    }

    // Build a readable body issues summary from zone descriptions
    const zoneDescriptions = data.zone_descriptions || {};
    const markedZones = data.marked_zones || [];
    const bodyIssuesSummary = markedZones
      .filter(z => zoneDescriptions[z]?.trim())
      .map(z => `${z.replace(/_/g, ' ')}: ${zoneDescriptions[z].trim()}`)
      .join('; ');
    const extraNotes = zoneDescriptions["_extra"]?.trim() || "";

    const profile = {
      display_name: data.display_name,
      age: data.age,
      sex: data.sex,
      height_inches: heightInches || undefined,
      weight_lbs: data.weight_lbs,
      goals: data.goals || [],
      activity_level: data.activity_level,
      disabilities: data.disabilities || [],
      body_limitations: [
        ...(bodyIssuesSummary ? [bodyIssuesSummary] : (data.body_limitations || [])),
        ...(extraNotes ? [`Additional notes: ${extraNotes}`] : [])
      ],
      pain_areas: data.pain_areas || {},
      current_abilities: data.current_abilities || {},
      risk_factors: data.risk_factors || [],
      is_veteran: data.is_veteran || false,
      veteran_details: data.veteran_details || {},
      fitness_mode: fitnessMode,
      onboarding_completed: true,
      onboarding_step: STEPS.length
    };

    if (existingProfileId) {
      await base44.entities.UserProfile.update(existingProfileId, profile);
    } else {
      await base44.entities.UserProfile.create(profile);
    }
    navigate("/");
  };

  const handleStartOver = async () => {
    if (existingProfileId) {
      await base44.entities.UserProfile.delete(existingProfileId);
    }
    setExistingProfileId(null);
    setData({});
    setStep(0);
    setSavedStep(null);
  };

  const handleResume = () => {
    setStep(savedStep);
    setSavedStep(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Resume prompt — shown when a saved in-progress onboarding is found
  if (savedStep !== null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-7 h-7 text-primary" />
            <span className="font-heading font-bold text-xl">FitAbility</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <p className="text-lg font-heading font-semibold">Welcome back!</p>
            <p className="text-muted-foreground text-sm">
              You were on step {savedStep + 1} of {STEPS.length} — <strong>{STEPS[savedStep]?.label}</strong>. Want to pick up where you left off?
            </p>
            <Button className="w-full gap-2" onClick={handleResume}>
              Continue where I left off <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={handleStartOver}>
              Start over from the beginning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" />
              <span className="font-heading font-bold text-lg">FitAbility</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Scrollable Step Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
          {step < STEPS.length && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                After onboarding, visit the <strong>Coach</strong> page anytime to adjust your workouts, get personalized tips, or ask questions about exercises.
              </p>
            </div>
          )}
          <StepComponent data={data} onChange={handleChange} />
        </div>
      </div>

      {/* Fixed Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 px-8 h-12 text-base"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="gap-2 px-8 h-12 text-base bg-primary"
            >
              {saving ? "Setting up your plan..." : "Start My Journey"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}