import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { isSpeechSupported, listenForAnswer, listenUntilPause } from "@/lib/speechEngine";
import { Mic } from "lucide-react";

const _ttsCache = {};

const BODY_ZONES = "head, neck, left_shoulder, right_shoulder, chest, upper_back, abdomen, lower_back, left_arm, right_arm, left_forearm, right_forearm, left_wrist, right_wrist, left_hip, right_hip, left_thigh, right_thigh, left_knee, right_knee, left_calf, right_calf, left_foot, right_foot";

function setIfPresent(p, keys, onChange) {
  const u = {};
  keys.forEach((k) => { if (p[k] !== undefined && p[k] !== null && p[k] !== "") u[k] = p[k]; });
  onChange(u);
}

const VOICE_STEPS = {
  0: {
    question: "Are you a veteran? You can just say yes, or no.",
    mapLocal: (t) => {
      const s = (t || "").toLowerCase();
      const no = s.includes("no") || s.includes("nope") || s.includes("nah");
      const yes = s.includes("yes") || s.includes("yeah") || s.includes("yep") || s.includes("yup") || s.includes("served");
      if (yes && !no) return { is_veteran: true };
      if (no && !yes) return { is_veteran: false };
      return null;
    },
    instruction: "The user is asked if they are a military veteran. Return JSON with is_veteran true or false.",
    schema: { type: "object", properties: { is_veteran: { type: "boolean" } }, required: ["is_veteran"] },
    apply: (p, onChange) => onChange({ is_veteran: !!p.is_veteran }),
    confirm: (p) => (p.is_veteran ? "Thank you for your service." : "Got it, not a veteran."),
  },
  1: {
    longAnswer: true,
    question: "Let us get some basics. Tell me your first name, your age, your sex, your height, and your weight.",
    instruction: "Extract the user basic info. Return JSON with display_name (first name string), age (number), sex (one of Male, Female, Non-binary, Prefer not to say), height_ft (number of feet), height_in (number of remaining inches), weight_lbs (number of pounds). Omit any field the user did not give.",
    schema: { type: "object", properties: { display_name: { type: "string" }, age: { type: "number" }, sex: { type: "string" }, height_ft: { type: "number" }, height_in: { type: "number" }, weight_lbs: { type: "number" } }, required: ["display_name"] },
    apply: (p, onChange) => setIfPresent(p, ["display_name", "age", "sex", "height_ft", "height_in", "weight_lbs"], onChange),
    confirm: (p) => "Thanks " + (p.display_name || "") + ".",
  },
  2: {
    question: "What are your main fitness goals? For example, improve balance, build strength, reduce pain, or improve mobility. You can name a few.",
    instruction: "Map the user goals to this exact list and return JSON { goals: [strings] } using only values from: Lose weight, Improve mobility, Reduce pain, Improve balance, Build strength, Increase stamina, Improve flexibility, Walk farther, Stand longer, Wheelchair fitness, Improve independence, Fall prevention, Better heart health, Better daily functioning.",
    schema: { type: "object", properties: { goals: { type: "array", items: { type: "string" } } }, required: ["goals"] },
    apply: (p, onChange) => onChange({ goals: Array.isArray(p.goals) ? p.goals : [] }),
    confirm: () => "Got it.",
  },
  3: {
    question: "How active are you day to day? For example: mostly seated, wheelchair user, limited walking, light activity, moderate activity, or active.",
    instruction: "Map the user activity level to exactly one of: Bedridden, Mostly seated, Wheelchair user, Limited walking, Light activity, Moderate activity, Active. Return JSON { activity_level: string }.",
    schema: { type: "object", properties: { activity_level: { type: "string" } }, required: ["activity_level"] },
    apply: (p, onChange) => onChange({ activity_level: p.activity_level }),
    confirm: (p) => "Okay, " + (p.activity_level || "") + ".",
  },
  4: {
    longAnswer: true,
    question: "Tell me about any pain, injuries, or parts of your body that limit you, and how they affect your day to day. Or just say I have none.",
    buildPrompt: (t) => "From the user description, extract the affected body zones and a short description for each. Use zone ids from this exact list: " + BODY_ZONES + ". Return JSON { marked_zones: [ids], zone_descriptions: { zoneId: shortDescription }, no_body_areas: boolean }. If they say none, set no_body_areas true and the others empty. The user said: " + t,
    schema: { type: "object", properties: { marked_zones: { type: "array", items: { type: "string" } }, zone_descriptions: { type: "object" }, no_body_areas: { type: "boolean" } }, required: ["marked_zones"] },
    apply: (p, onChange) => onChange({ marked_zones: Array.isArray(p.marked_zones) ? p.marked_zones : [], zone_descriptions: p.zone_descriptions || {}, no_body_areas: !!p.no_body_areas }),
    confirm: (p) => (p.no_body_areas ? "Okay, no problem areas." : "Got it, thank you."),
  },
  5: {
    type: "manual",
    question: "Here is what I understood about your body areas. Feel free to change anything on the screen, then say next to continue.",
  },
  6: {
    type: "manual",
    question: "For this step, please tap your ability answers on the screen. When you are finished, say next to continue.",
  },
  7: {
    longAnswer: true,
    question: "Do you have any of these health risk factors? For example: history of falls, heart condition, osteoporosis, dizziness, recent surgery, or pregnancy. Or say none.",
    instruction: "Map the user health risk factors to this exact list and return JSON { risk_factors: [strings], no_risk_factors: boolean, risk_factor_details: string } using only values from: History of falls, Recent surgery (last 6 months), Osteoporosis, Heart condition, Dizziness/Vertigo, Seizure disorder, Blood clot history, Pacemaker/defibrillator, Oxygen dependent, Dialysis, Active cancer treatment, Pregnant, Recent hospitalization. Put any extra detail they mention into risk_factor_details. If they say none, set no_risk_factors true and risk_factors empty.",
    schema: { type: "object", properties: { risk_factors: { type: "array", items: { type: "string" } }, no_risk_factors: { type: "boolean" }, risk_factor_details: { type: "string" } }, required: ["risk_factors"] },
    apply: (p, onChange) => onChange({ risk_factors: Array.isArray(p.risk_factors) ? p.risk_factors : [], no_risk_factors: !!p.no_risk_factors, risk_factor_details: p.risk_factor_details || "" }),
    confirm: (p) => (p.no_risk_factors ? "Okay, none noted." : "Got it."),
  },
  8: {
    question: "What equipment do you have? For example: resistance bands, dumbbells, an exercise mat, a cane or walker, a wheelchair, or none.",
    instruction: "Map the user equipment to ids from this exact list and return JSON { equipment: [ids] } using only: none, resistance_bands, dumbbells, mat, cane_walker, wheelchair.",
    schema: { type: "object", properties: { equipment: { type: "array", items: { type: "string" } } }, required: ["equipment"] },
    apply: (p, onChange) => onChange({ equipment: Array.isArray(p.equipment) ? p.equipment : [] }),
    confirm: () => "All set. You can change any of your answers anytime in Settings.",
  },
};

function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
    o.onended = () => { try { ctx.close(); } catch (e) {} };
  } catch (e) {}
}

export default function VoiceOnboarding({ step, data, onChange, onAdvance }) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [decided, setDecided] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const ranStepRef = useRef(-1);
  const promptedRef = useRef(false);

  const speak = async (text) => {
    try {
      let url = _ttsCache[text];
      if (!url) {
        const res = await base44.functions.invoke("openaiTTS", { text, voice: "nova" });
        url = res && res.data && res.data.url;
        if (url) _ttsCache[text] = url;
      }
      if (!url) return;
      await new Promise((resolve) => {
        const a = new Audio(url);
        a.onended = resolve;
        a.onerror = resolve;
        a.play().catch(() => resolve());
      });
    } catch (e) {}
  };

  const acceptVoice = () => { setShowPrompt(false); setDecided(true); setVoiceMode(true); };
  const declineVoice = () => { setShowPrompt(false); setDecided(true); setVoiceMode(false); };

  useEffect(() => {
    if (!isSpeechSupported()) return;
    if (promptedRef.current || decided || step !== 0) return;
    promptedRef.current = true;
    setShowPrompt(true);
  }, [step, decided]);

  const runStep = async () => {
    const cfg = VOICE_STEPS[step];
    if (!cfg) return;
    setBusy(true);
    try {
      setStatus("Speaking...");
      await speak(cfg.question);
      setStatus("Listening...");
      playChime();
      const transcript = cfg.longAnswer
        ? await listenUntilPause(20000, 1500, 2500)
        : await listenForAnswer(cfg.type === "manual" ? 30000 : 12000, 1800);
      const low = (transcript || "").toLowerCase();

      if (cfg.type === "manual") {
        setStatus("");
        setBusy(false);
        if (low.includes("next") || low.includes("continue") || low.includes("done")) { if (onAdvance) onAdvance(); }
        else { ranStepRef.current = -1; }
        return;
      }

      if (!transcript) {
        setStatus("");
        await speak("Sorry, I did not catch that. Let us try again.");
        ranStepRef.current = -1;
        setBusy(false);
        return;
      }

      setStatus("Heard: " + transcript);
      let parsed = cfg.mapLocal ? cfg.mapLocal(transcript) : null;
      if (!parsed) {
        try {
          const prompt = cfg.buildPrompt ? cfg.buildPrompt(transcript, data) : (cfg.instruction + " The user said: " + transcript);
          const res = await base44.functions.invoke("openaiChat", { prompt, response_json_schema: cfg.schema });
          parsed = res && res.data ? res.data : null;
        } catch (e) {}
      }
      if (!parsed) {
        setStatus("");
        await speak("Sorry, let us try that again.");
        ranStepRef.current = -1;
        setBusy(false);
        return;
      }

      cfg.apply(parsed, onChange);
      await speak(cfg.confirm ? cfg.confirm(parsed) : "Got it.");
      setStatus("");
      setBusy(false);
      if (onAdvance) onAdvance();
    } catch (e) {
      setStatus("");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (voiceMode && VOICE_STEPS[step] && !busy && ranStepRef.current !== step) {
      ranStepRef.current = step;
      runStep();
    }
  }, [voiceMode, step, busy]);

  if (!isSpeechSupported()) return null;

  return (
    <>
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="hf-title" className="bg-card rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-border">
            <Mic className="w-10 h-10 mx-auto text-primary mb-3" />
            <h2 id="hf-title" className="text-lg font-bold mb-2 text-foreground">Set up hands-free?</h2>
            <p className="text-sm text-muted-foreground mb-5">I can read each question out loud and you answer by speaking — no typing. You can switch to tapping anytime.</p>
            <div className="flex gap-3">
              <button onClick={acceptVoice} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Yes, let us talk</button>
              <button onClick={declineVoice} className="flex-1 py-3 rounded-xl border border-border font-semibold text-foreground">No, I will tap</button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => (voiceMode ? declineVoice() : acceptVoice())} className={"inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border " + (voiceMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border")}>
          <Mic className="w-4 h-4" />
          {voiceMode ? "Hands-free on" : "Answer out loud"}
        </button>
        {voiceMode && status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </div>
    </>
  );
}