import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import { ABILITIES_CHECKLIST_GRADED, ABILITIES_CHECKLIST_GRADED_SEATED } from "@/lib/constants";
import { isSpeechSupported, captureOnce, stopCapture } from "@/lib/speechEngine";
import StepBasicInfo from "@/components/onboarding/StepBasicInfo";
import StepGoals from "@/components/onboarding/StepGoals";
import StepActivityLevel from "@/components/onboarding/StepActivityLevel";
import StepBodyMap from "@/components/onboarding/StepBodyMap";
import StepZoneConditions from "@/components/onboarding/StepZoneConditions";

import StepAbilities, { isNonAmbulatory } from "@/components/onboarding/StepAbilities";
import StepRiskFactors from "@/components/onboarding/StepRiskFactors";
import StepVeteran from "@/components/onboarding/StepVeteran";
import StepEquipment from "@/components/onboarding/StepEquipment";
import VoiceOnboarding from "@/components/onboarding/VoiceOnboarding";

const STEPS = [
  { key: "veteran", label: "Veteran", component: StepVeteran },
  { key: "basic", label: "About You", component: StepBasicInfo },
  { key: "goals", label: "Goals", component: StepGoals },
  { key: "activity", label: "Activity", component: StepActivityLevel },
  { key: "disabilities", label: "Body Map", component: StepBodyMap },
  { key: "limitations", label: "Your Body", component: StepZoneConditions },
  { key: "abilities", label: "Abilities", component: StepAbilities },
  { key: "risk", label: "Risk Factors", component: StepRiskFactors },
  { key: "equipment", label: "Equipment", component: StepEquipment },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [existingProfileId, setExistingProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedStep, setSavedStep] = useState(null); // non-null = show resume prompt
  const [autoVoice, setAutoVoice] = useState(false);

  // Load any saved onboarding progress on mount
  useEffect(() => {
    const loadProgress = async (attempt = 0) => {
      let profiles;
      try {
        profiles = await base44.entities.UserProfile.filter({});
      } catch (e) {
        if (attempt < 3) {
          setTimeout(() => loadProgress(attempt + 1), 1000 * (attempt + 1));
          return;
        }
        setLoading(false);
        return;
      }
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
          risk_factor_details: profile.risk_factor_details || {},
          is_veteran: profile.is_veteran,
          veteran_details: profile.veteran_details,
          fitness_mode: profile.fitness_mode,
          equipment: profile.equipment || [],
        });
      }
      setLoading(false);
    };
    loadProgress();
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;
  const StepComponent = STEPS[step].component;

  const handleChange = (updates) => {
    dataRef.current = { ...dataRef.current, ...updates };
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    if (step === 0) return data.is_veteran !== undefined;
    if (step === 1) return data.display_name && data.age;
    if (step === 2) return (data.goals || []).length > 0;
    if (step === 3) return !!data.activity_level;
    
    // Step 4: Body Map — require at least one marked zone OR no_body_areas selected
    if (step === 4) return (data.marked_zones || []).length > 0 || data.no_body_areas;
    
    // Step 5: Zone Descriptions — optional, always allow continue
    if (step === 5) return true;
    
    // Step 6: Abilities — require self_reported_fitness, condition_severity (if applicable), and all shown ability questions answered
    if (step === 6) {
      if (!data.self_reported_fitness) return false;
      
      // condition_severity required only if user has conditions
      const hasConditions =
        (data.disabilities || []).length > 0 ||
        (data.body_limitations || []).length > 0 ||
        Object.keys(data.pain_areas || {}).length > 0 ||
        (data.marked_zones || []).length > 0;
      
      if (hasConditions && !data.condition_severity) return false;
      
      // All shown ability questions must be answered
      const checklist = isNonAmbulatory(data) ? ABILITIES_CHECKLIST_GRADED_SEATED : ABILITIES_CHECKLIST_GRADED;
      const abilities = data.current_abilities || {};
      
      // Every question in the active checklist must have a value
      for (const q of checklist) {
        if (!abilities[q.id]) return false;
      }
      
      return true;
    }
    
    // Step 7: Risk Factors — require at least one selected OR no_risk_factors selected
    if (step === 7) return (data.risk_factors || []).length > 0 || data.no_risk_factors;
    
    // Step 8: Equipment — require at least one selected
    if (step === 8) return (data.equipment || []).length > 0;
    
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
          risk_factor_details: currentData.risk_factor_details || {},
      is_veteran: currentData.is_veteran || false,
      veteran_details: currentData.veteran_details || {},
      equipment: currentData.equipment || [],
      self_reported_fitness: currentData.self_reported_fitness || undefined,
      condition_severity: currentData.condition_severity || undefined,
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
    setNavigating(true);
    const next = step + 1;
    try {
      await saveProgress(next, data);
    } catch (e) {
      console.error("Onboarding step save failed (answers kept locally):", e);
    } finally {
      setStep(next);
      setNavigating(false);
    }
  };

  const handleFinish = async () => {
    const data = dataRef.current;
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
          risk_factor_details: data.risk_factor_details || {},
      is_veteran: data.is_veteran || false,
      veteran_details: data.veteran_details || {},
      equipment: data.equipment || [],
      fitness_mode: fitnessMode,
      self_reported_fitness: data.self_reported_fitness || undefined,
      condition_severity: data.condition_severity || undefined,
      onboarding_completed: true,
      onboarding_step: STEPS.length
    };

    try {
      if (existingProfileId) {
        await base44.entities.UserProfile.update(existingProfileId, profile);
      } else {
        await base44.entities.UserProfile.create(profile);
      }
      navigate("/");
    } catch (e) {
      console.error("Onboarding finish failed:", e);
      setSaving(false);
    }
  };

  const handleVoiceAdvance = async () => {
    if (step >= STEPS.length - 1) { handleFinish(); return; }
    const next = step + 1;
    try { await saveProgress(next, dataRef.current); }
    catch (e) { console.error("Voice onboarding step save failed (answers kept locally):", e); }
    finally { setStep(next); }
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

  const resumeActedRef = useRef(false);
  const actResume = (fn, voiceWanted) => {
    if (resumeActedRef.current) return;
    resumeActedRef.current = true;
    try { stopCapture(); } catch (e) {}
    if (voiceWanted) setAutoVoice(true);
    fn();
  };
  const speakResume = async (text) => {
    try {
      const res = await base44.functions.invoke("openaiTTS", { text, voice: "nova" });
      const url = res && res.data && res.data.url;
      if (!url) return;
      await new Promise((resolve) => { const a = new Audio(url); a.onended = resolve; a.onerror = resolve; a.play().catch(() => resolve()); });
    } catch (e) {}
  };
  useEffect(() => {
    if (savedStep === null || resumeActedRef.current || !isSpeechSupported()) return;
    let cancelled = false;
    (async () => {
      await speakResume("Welcome back. You were partway through setting up FitAbility. To keep going where you left off, say continue, or tap anywhere on the screen. Or, to start over from the beginning, say start over.");
      if (cancelled || resumeActedRef.current) return;
      let heard = "";
      try { heard = await captureOnce(8000); } catch (e) {}
      if (cancelled || resumeActedRef.current) return;
      const low = (heard || "").toLowerCase();
      if (/start over|start again|restart|begin again|from the beginning/.test(low)) { actResume(handleStartOver, false); }
      else if (low.trim()) { actResume(handleResume, true); }
    })();
    return () => { cancelled = true; };
  }, [savedStep]);

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
      <div onClick={() => actResume(handleResume, true)} role="button" aria-label="Tap anywhere to continue where you left off" className="min-h-screen bg-background flex flex-col items-center justify-center px-6 cursor-pointer">
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
            <Button className="w-full gap-2" onClick={(e) => { e.stopPropagation(); actResume(handleResume, false); }}>
              Continue where I left off <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={(e) => { e.stopPropagation(); actResume(handleStartOver, false); }}>
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

          <VoiceOnboarding step={step} data={data} onChange={handleChange} onAdvance={handleVoiceAdvance} autoVoice={autoVoice} />
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
              disabled={!canProceed() || navigating}
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
          <p className="text-xs text-center text-muted-foreground mt-4">You can change any of these answers later in Settings.</p>
        </div>
      </div>
    </div>
  );
}