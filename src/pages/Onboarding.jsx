import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import StepBasicInfo from "@/components/onboarding/StepBasicInfo";
import StepGoals from "@/components/onboarding/StepGoals";
import StepActivityLevel from "@/components/onboarding/StepActivityLevel";
import StepDisabilities from "@/components/onboarding/StepDisabilities";
import StepBodyLimitations from "@/components/onboarding/StepBodyLimitations";
import StepPainAssessment from "@/components/onboarding/StepPainAssessment";
import StepAbilities from "@/components/onboarding/StepAbilities";
import StepRiskFactors from "@/components/onboarding/StepRiskFactors";
import StepVeteran from "@/components/onboarding/StepVeteran";

const STEPS = [
  { key: "veteran", label: "Veteran", component: StepVeteran },
  { key: "basic", label: "About You", component: StepBasicInfo },
  { key: "goals", label: "Goals", component: StepGoals },
  { key: "activity", label: "Activity", component: StepActivityLevel },
  { key: "disabilities", label: "Conditions", component: StepDisabilities },
  { key: "limitations", label: "Limitations", component: StepBodyLimitations },
  { key: "pain", label: "Pain", component: StepPainAssessment },
  { key: "abilities", label: "Abilities", component: StepAbilities },
  { key: "risk", label: "Risk Factors", component: StepRiskFactors },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;
  const StepComponent = STEPS[step].component;

  const handleChange = (updates) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    if (step === 0) return data.is_veteran !== undefined; // veteran step requires a yes/no answer
    if (step === 1) return data.display_name && data.age;
    if (step === 2) return (data.goals || []).length > 0;
    if (step === 3) return !!data.activity_level;
    return true;
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

    const profile = {
      display_name: data.display_name,
      age: data.age,
      sex: data.sex,
      height_inches: heightInches || undefined,
      weight_lbs: data.weight_lbs,
      goals: data.goals || [],
      activity_level: data.activity_level,
      disabilities: data.disabilities || [],
      body_limitations: data.body_limitations || [],
      pain_areas: data.pain_areas || {},
      current_abilities: data.current_abilities || {},
      risk_factors: data.risk_factors || [],
      is_veteran: data.is_veteran || false,
      veteran_details: data.veteran_details || {},
      fitness_mode: fitnessMode,
      onboarding_completed: true,
      onboarding_step: STEPS.length
    };

    await base44.entities.UserProfile.create(profile);
    navigate("/");
  };

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
              onClick={() => setStep(s => s + 1)}
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