import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { isSpeechSupported, captureAnswer } from "@/lib/speechEngine";
import { Mic } from "lucide-react";

const _ttsCache = {};

const BODY_ZONES = "head, neck, left_shoulder, right_shoulder, chest, upper_back, abdomen, lower_back, left_arm, right_arm, left_forearm, right_forearm, left_wrist, right_wrist, left_hip, right_hip, left_thigh, right_thigh, left_knee, right_knee, left_calf, right_calf, left_foot, right_foot";

function setIfPresent(p, keys, onChange) {
  const u = {};
  keys.forEach((k) => { if (p[k] !== undefined && p[k] !== null && p[k] !== "") u[k] = p[k]; });
  if (Object.keys(u).length) onChange(u);
}

const VOICE_STEPS = {
  0: { parts: [{
    question: "Are you a veteran? You can just say yes, or no.",
    clipMs: 1500,
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
  }] },
  1: { parts: [
    {
      question: "First, what is your name, and how old are you?",
      clipMs: 3500,
      instruction: "Extract the user first name and age. Return JSON with display_name (first name string) and age (number).",
      schema: { type: "object", properties: { display_name: { type: "string" }, age: { type: "number" } }, required: ["display_name"] },
      apply: (p, onChange) => setIfPresent(p, ["display_name", "age"], onChange),
    },
    {
      question: "Got it. Now, what is your sex, your height, and your weight?",
      clipMs: 4000,
      instruction: "Extract JSON with sex (one of Male, Female, Non-binary, Prefer not to say), height_ft (number of feet), height_in (number of remaining inches), weight_lbs (number of pounds). Omit any the user did not give.",
      schema: { type: "object", properties: { sex: { type: "string" }, height_ft: { type: "number" }, height_in: { type: "number" }, weight_lbs: { type: "number" } }, required: [] },
      apply: (p, onChange) => setIfPresent(p, ["sex", "height_ft", "height_in", "weight_lbs"], onChange),
    },
  ] },
  2: { parts: [{
    question: "What are your main fitness goals? For example, improve balance, build strength, reduce pain, or improve mobility. You can name a few.",
    clipMs: 3500,
    instruction: "List the user fitness goals in their own words as short phrases. If a goal clearly matches one of these, use that exact wording: Lose weight, Improve mobility, Reduce pain, Improve balance, Build strength, Increase stamina, Improve flexibility, Walk farther, Stand longer, Wheelchair fitness, Improve independence, Fall prevention, Better heart health, Better daily functioning. Otherwise keep the user own words. Return JSON { goals: [strings] }.",
    schema: { type: "object", properties: { goals: { type: "array", items: { type: "string" } } }, required: ["goals"] },
    apply: (p, onChange) => onChange({ goals: Array.isArray(p.goals) ? p.goals : [] }),
  }] },
  3: { parts: [{
    question: "How active are you day to day? For example: mostly seated, wheelchair user, limited walking, light activity, moderate activity, or active.",
    clipMs: 2500,
    instruction: "Map the user activity level to exactly one of: Bedridden, Mostly seated, Wheelchair user, Limited walking, Light activity, Moderate activity, Active. Return JSON { activity_level: string }.",
    schema: { type: "object", properties: { activity_level: { type: "string" } }, required: ["activity_level"] },
    apply: (p, onChange) => onChange({ activity_level: p.activity_level }),
  }] },
  4: { parts: [{
    question: "Tell me about any pain, injuries, or parts of your body that limit you, and how they affect your day to day. Or just say I have none.",
    clipMs: 6000,
    buildPrompt: (t) => "From the user description, extract the affected body zones and a short description for each. Use zone ids from this exact list: " + BODY_ZONES + ". Return JSON { marked_zones: [ids], zone_descriptions: { zoneId: shortDescription }, no_body_areas: boolean }. If they say none, set no_body_areas true and the others empty. The user said: " + t,
    schema: { type: "object", properties: { marked_zones: { type: "array", items: { type: "string" } }, zone_descriptions: { type: "object" }, no_body_areas: { type: "boolean" } }, required: ["marked_zones"] },
    apply: (p, onChange) => onChange({ marked_zones: Array.isArray(p.marked_zones) ? p.marked_zones : [], zone_descriptions: p.zone_descriptions || {}, no_body_areas: !!p.no_body_areas }),
  }] },
  5: { type: "manual", question: "Here is what I understood about your body areas. Feel free to change anything on the screen, then say next to continue." },
  6: { type: "manual", question: "For this step, please tap your ability answers on the screen. When you are finished, say next to continue." },
  7: { parts: [{
    question: "Do you have any of these health risk factors? For example: history of falls, heart condition, osteoporosis, dizziness, recent surgery, or pregnancy. Or say none.",
    clipMs: 4500,
    instruction: "Map the user health risk factors to this exact list and return JSON { risk_factors: [strings], no_risk_factors: boolean, risk_factor_details: string } using only values from: History of falls, Recent surgery (last 6 months), Osteoporosis, Heart condition, Dizziness/Vertigo, Seizure disorder, Blood clot history, Pacemaker/defibrillator, Oxygen dependent, Dialysis, Active cancer treatment, Pregnant, Recent hospitalization. Put extra detail in risk_factor_details. If they say none, set no_risk_factors true and risk_factors empty.",
    schema: { type: "object", properties: { risk_factors: { type: "array", items: { type: "string" } }, no_risk_factors: { type: "boolean" }, risk_factor_details: { type: "string" } }, required: ["risk_factors"] },
    apply: (p, onChange) => onChange({ risk_factors: Array.isArray(p.risk_factors) ? p.risk_factors : [], no_risk_factors: !!p.no_risk_factors, risk_factor_details: p.risk_factor_details || "" }),
  }] },
  8: {
    finalMessage: "All set. You can change any of your answers anytime in Settings.",
    parts: [{
      question: "Last one. What equipment do you have? For example: resistance bands, dumbbells, an exercise mat, a cane or walker, a wheelchair, or none.",
      clipMs: 3500,
      instruction: "Map the user equipment to ids from this exact list and return JSON { equipment: [ids] } using only: none, resistance_bands, dumbbells, mat, cane_walker, wheelchair.",
      schema: { type: "object", properties: { equipment: { type: "array", items: { type: "string" } } }, required: ["equipment"] },
      apply: (p, onChange) => onChange({ equipment: Array.isArray(p.equipment) ? p.equipment : [] }),
    }],
  },
};

function beep(freq, when, dur) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = beep._ctx || (beep._ctx = new AC());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function listenChime() { beep(660, 0, 0.14); }
function gotItChime() { beep(880, 0, 0.1); beep(1150, 0.11, 0.12); }

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
      if (cfg.type === "manual") {
        setStatus("Speaking...");
        await speak(cfg.question);
        setStatus("Listening...");
        listenChime();
        const t = await captureAnswer({ maxMs: 20000, silenceMs: 1200 });
        const low = (t || "").toLowerCase();
        setStatus("");
        setBusy(false);
        if (low.includes("next") || low.includes("continue") || low.includes("done")) { if (onAdvance) onAdvance(); }
        else { ranStepRef.current = -1; }
        return;
      }

      const parts = cfg.parts || [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let transcript = "";
        for (let attempt = 0; attempt < 2 && !transcript; attempt++) {
          setStatus("Speaking...");
          await speak(attempt === 0 ? part.question : "Sorry, I did not catch that. " + part.question);
          setStatus("Listening...");
          listenChime();
          transcript = await captureAnswer({ maxMs: 18000 });
        }
        if (!transcript) continue;
        setStatus("Heard: " + transcript);
        let parsed = part.mapLocal ? part.mapLocal(transcript) : null;
        if (!parsed) {
          try {
            const prompt = part.buildPrompt ? part.buildPrompt(transcript, data) : (part.instruction + " The user said: " + transcript);
            const res = await base44.functions.invoke("openaiChat", { prompt, response_json_schema: part.schema });
            parsed = res && res.data ? res.data : null;
          } catch (e) {}
        }
        if (parsed) part.apply(parsed, onChange);
      }

      if (cfg.finalMessage) { await speak(cfg.finalMessage); }
      else { gotItChime(); }
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