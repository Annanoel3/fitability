import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { isSpeechSupported, captureOnce, stopCapture } from "@/lib/speechEngine";
import { ABILITIES_CHECKLIST_GRADED, ABILITIES_CHECKLIST_GRADED_SEATED } from "@/lib/constants";
import { Mic } from "lucide-react";

const _ttsCache = {};

const BODY_ZONES = "head, neck, left_shoulder, right_shoulder, chest, upper_back, abdomen, lower_back, left_arm, right_arm, left_forearm, right_forearm, left_wrist, right_wrist, left_hip, right_hip, left_thigh, right_thigh, left_knee, right_knee, left_calf, right_calf, left_foot, right_foot";

function setIfPresent(p, keys, onChange) {
  const u = {};
  keys.forEach((k) => { if (p[k] !== undefined && p[k] !== null && p[k] !== "") u[k] = p[k]; });
  if (Object.keys(u).length) onChange(u);
}

const fmtAbilities = (arr) => arr.map((i) => i.id + " (" + i.options.join("/") + ")").join("; ");

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
    instruction: "The user describes their fitness goals in their own words. Return JSON { goals: [strings] } listing EVERY goal they mention, not just the first. For each goal, if it matches one of these preset options use the EXACT preset text with the same capitalization: Lose weight, Improve mobility, Reduce pain, Improve balance, Build strength, Increase stamina, Improve flexibility, Walk farther, Stand longer, Wheelchair fitness, Improve independence, Fall prevention, Better heart health, Better daily functioning. If a goal does not match any preset, include it word for word as the user said it. Never drop a goal.",
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
    question: "Tell me about any pain, injuries, or other things that limit you day to day. For example, back or joint pain, trouble with balance, trouble seeing or low vision, or trouble hearing. Tell me how they affect you, or just say I have none.",
    clipMs: 6000,
    buildPrompt: (t) => "You are extracting body areas from a user's spoken description of their pain, injuries, and limitations. " +
      "Here are the available body zone IDs: " + BODY_ZONES + ". " +
      "Map what the user says to the CLOSEST matching zone IDs — do NOT require exact wording. For example: 'lower back' or 'lumbar' maps to lower_back; 'shoulder blade' or 'upper back' maps to upper_back; 'hamstring' or 'thigh' maps to left_thigh and/or right_thigh (use both if side is not specified); 'kneecap' or 'patella' maps to left_knee and/or right_knee; 'calf' or 'shin' maps to left_calf and/or right_calf; 'ankle' or 'foot' maps to left_foot and/or right_foot; 'rotator cuff' or 'deltoid' maps to left_shoulder and/or right_shoulder; 'bicep' or 'tricep' maps to left_arm and/or right_arm; 'wrist' maps to left_wrist and/or right_wrist; 'hip' or 'glute' maps to left_hip and/or right_hip. " +
      "If the user mentions a side (left/right), use only that side's zone. If no side is mentioned, include BOTH left and right zones. " +
      "For each mapped zone, include a short description of what the user said about it in zone_descriptions. " +
      "Also extract any non-physical or sensory limitations (low vision, blindness, trouble seeing, hearing loss, dizziness, etc.) into other_limitations. " +
      "IMPORTANT: Do NOT silently drop anything. If the user mentions a body area, condition, or symptom that does not cleanly map to a zone ID, put it in the notes array as a plain-language string. " +
      "If they clearly have nothing at all, set no_body_areas true and leave all arrays/objects empty. " +
      "Return JSON { marked_zones: [zone_ids], zone_descriptions: { zoneId: shortDescription }, no_body_areas: boolean, other_limitations: [strings], notes: [strings] }. " +
      "The user said: " + t,
    schema: { type: "object", properties: { marked_zones: { type: "array", items: { type: "string" } }, zone_descriptions: { type: "object" }, no_body_areas: { type: "boolean" }, other_limitations: { type: "array", items: { type: "string" } }, notes: { type: "array", items: { type: "string" } } }, required: ["marked_zones"] },
    apply: (p, onChange) => {
      const zoneDescs = p.zone_descriptions || {};
      const notes = Array.isArray(p.notes) ? p.notes.filter(n => n && n.trim()) : [];
      if (notes.length) {
        const existing = (zoneDescs["_extra"] || "").trim();
        zoneDescs["_extra"] = existing ? existing + " " + notes.join("; ") : notes.join("; ");
      }
      onChange({
        marked_zones: Array.isArray(p.marked_zones) ? p.marked_zones : [],
        zone_descriptions: zoneDescs,
        no_body_areas: !!p.no_body_areas,
        disabilities: Array.isArray(p.other_limitations) ? p.other_limitations : [],
      });
    },
  }] },
  5: { type: "auto", question: "Got it." },
  6: { parts: [{
    question: "Do you have any health conditions I should know about? For example, a history of falls, a heart condition, osteoporosis, dizziness, a recent surgery, or pregnancy. Or say none.",
    clipMs: 4500,
    instruction: "Return JSON { risk_factors: [strings], no_risk_factors: boolean, risk_factor_details: string }. List EVERY condition the user mentions, not just the first. For each, if it matches one of these use the EXACT text: History of falls, Recent surgery (last 6 months), Osteoporosis, Heart condition, Dizziness/Vertigo, Seizure disorder, Blood clot history, Pacemaker/defibrillator, Oxygen dependent, Dialysis, Active cancer treatment, Pregnant, Recent hospitalization. If a condition does not match any of these, still record it in risk_factor_details in the user's own words. Put any extra detail in risk_factor_details too. If they clearly say none, set no_risk_factors true and risk_factors empty.",
    schema: { type: "object", properties: { risk_factors: { type: "array", items: { type: "string" } }, no_risk_factors: { type: "boolean" }, risk_factor_details: { type: "string" } }, required: ["risk_factors"] },
    apply: (p, onChange) => onChange({ risk_factors: Array.isArray(p.risk_factors) ? p.risk_factors : [], no_risk_factors: !!p.no_risk_factors, risk_factor_details: p.risk_factor_details || "" }),
  }] },
  7: { parts: (data) => {
      const seated = ["Bedridden", "Mostly seated", "Wheelchair user"].includes(data.activity_level);
      const checklist = seated ? ABILITIES_CHECKLIST_GRADED_SEATED : ABILITIES_CHECKLIST_GRADED;
      const hasConditions =
        (data.disabilities || []).length > 0 ||
        (data.body_limitations || []).length > 0 ||
        Object.keys(data.pain_areas || {}).length > 0 ||
        (data.marked_zones || []).length > 0;

      const parts = [];

      // Part 1: overall fitness (+ condition severity if applicable)
      if (hasConditions) {
        parts.push({
          question: "Let's go through your current abilities. First, how would you describe your overall fitness right now — just starting out, light, medium, strong, or athletic? And how much do your conditions or pain affect your daily activities — not at all, a little, moderately, or severely?",
          clipMs: 4000,
          instruction: "Return JSON with self_reported_fitness (one of exactly: Just starting out, Light, Medium, Strong, Athletic) and condition_severity (one of exactly: Not at all, A little, Moderately, Severely). The user said: ",
          schema: { type: "object", properties: { self_reported_fitness: { type: "string" }, condition_severity: { type: "string" } }, required: ["self_reported_fitness", "condition_severity"] },
          apply: (p, onChange) => { const u = {}; if (p.self_reported_fitness) u.self_reported_fitness = p.self_reported_fitness; if (p.condition_severity) u.condition_severity = p.condition_severity; onChange(u); },
        });
      } else {
        parts.push({
          question: "Let's go through your current abilities. First, how would you describe your overall fitness right now — just starting out, light, medium, strong, or athletic?",
          clipMs: 3000,
          instruction: "Return JSON with self_reported_fitness (one of exactly: Just starting out, Light, Medium, Strong, Athletic). The user said: ",
          schema: { type: "object", properties: { self_reported_fitness: { type: "string" } }, required: ["self_reported_fitness"] },
          apply: (p, onChange) => { if (p.self_reported_fitness) onChange({ self_reported_fitness: p.self_reported_fitness }); },
        });
      }

      // One part per graded ability question — asked individually
      checklist.forEach(({ id, question, options }) => {
        parts.push({
          question: question + " Just say one of: " + options.join(", ") + ".",
          clipMs: 3000,
          instruction: 'The user is answering this question: "' + question + '" The only valid answers are: ' + options.join(", ") + '. Return JSON with a single key "' + id + '" set to the EXACT option string that best matches what the user said. The user said: ',
          schema: { type: "object", properties: { [id]: { type: "string", enum: options } }, required: [id] },
          apply: (p, onChange) => { if (p[id]) onChange({ current_abilities: { [id]: p[id] } }); },
        });
      });

      return parts;
    },
  },
  8: {
    finalMessage: "All set. You can change any of your answers anytime in Settings.",
    parts: [{
      question: "Last one. What equipment do you have? For example: resistance bands, dumbbells, an exercise mat, a cane or walker, a wheelchair, or none.",
      clipMs: 3500,
      instruction: "Return JSON { equipment: [ids] } listing EVERY item the user mentions, not just the first. For each item, if it matches one of these ids use the EXACT id: none, resistance_bands, dumbbells, mat, cane_walker, wheelchair. If an item does not match any id, include it as a short lowercase label in the user's own words. Never drop an item.",
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
function stopChime() { beep(520, 0, 0.16); }

export default function VoiceOnboarding({ step, data, onChange, onAdvance, autoVoice }) {
  const [voiceMode, setVoiceMode] = useState(() => {
    try { return localStorage.getItem("fitability_voice_mode") === "talk"; } catch (e) { return false; }
  });
  const [decided, setDecided] = useState(() => {
    try { return !!localStorage.getItem("fitability_voice_mode"); } catch (e) { return false; }
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);
  const ranStepRef = useRef(-1);
  const promptedRef = useRef(false);
  const introSpokenRef = useRef(false);
  const holdTimerRef = useRef(null);
  const [holding, setHolding] = useState(false);
  const [hintPulse, setHintPulse] = useState(true);
  useEffect(() => {
    setHintPulse(true);
    const t = setTimeout(() => setHintPulse(false), 9000);
    return () => clearTimeout(t);
  }, [voiceMode]);

  const audioRef = useRef(null);
  const speakIdRef = useRef(0);
  const cancelledRef = useRef(false);
  const speakResolveRef = useRef(null);

  const stopAudio = () => {
    speakIdRef.current++;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (speakResolveRef.current) {
      const r = speakResolveRef.current;
      speakResolveRef.current = null;
      r();
    }
  };

  const speak = async (text) => {
    const myId = ++speakIdRef.current;
    try {
      let url = _ttsCache[text];
      if (!url) {
        const res = await base44.functions.invoke("openaiTTS", { text, voice: "nova" });
        url = res && res.data && res.data.url;
        if (url) _ttsCache[text] = url;
      }
      if (!url) return;
      if (cancelledRef.current || speakIdRef.current !== myId) return;
      await new Promise((resolve) => {
        speakResolveRef.current = resolve;
        const a = new Audio(url);
        audioRef.current = a;
        const done = () => { speakResolveRef.current = null; if (audioRef.current === a) audioRef.current = null; resolve(); };
        a.onended = done;
        a.onerror = done;
        a.play().catch(() => done());
      });
    } catch (e) {}
  };

  const teardown = () => {
    cancelledRef.current = true;
    stopAudio();
    try { stopCapture(); } catch (e) {}
    setListening(false);
    setBusy(false);
    setStatus("");
  };

  const acceptVoice = () => {
    try { localStorage.setItem("fitability_voice_mode", "talk"); } catch (e) {}
    cancelledRef.current = false;
    ranStepRef.current = -1;
    setShowPrompt(false);
    setDecided(true);
    setVoiceMode(true);
  };
  const declineVoice = () => {
    try { localStorage.setItem("fitability_voice_mode", "tap"); } catch (e) {}
    teardown();
    setShowPrompt(false);
    setDecided(true);
    setVoiceMode(false);
    setHolding(false);
  };

  const finishRecording = () => { if (listening) { try { stopCapture(); } catch (e) {} setListening(false); } };
  const startHold = () => {
    setHolding(true);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => { setHolding(false); if (voiceMode) { declineVoice(); } else { acceptVoice(); } }, 3000);
  };
  const cancelHold = () => {
    setHolding(false);
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  };

  useEffect(() => {
    if (!isSpeechSupported()) return;
    if (promptedRef.current || decided || step !== 0) return;
    promptedRef.current = true;
    setShowPrompt(true);
  }, [step, decided]);

  useEffect(() => {
    if (autoVoice && !decided) { setDecided(true); setVoiceMode(true); }
  }, [autoVoice, decided]);

  const runStep = async () => {
    const cfg = VOICE_STEPS[step];
    if (!cfg) return;
    setBusy(true);
    try {
      if (!introSpokenRef.current) {
        introSpokenRef.current = true;
        await speak("I'll ask each question out loud. Answer by speaking. When you are done talking, tap anywhere on the screen.");
      }
      if (cancelledRef.current) { setBusy(false); return; }
      if (cfg.type === "auto") {
        if (cfg.question) { setStatus("Speaking..."); await speak(cfg.question); }
        if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
        setStatus(""); setBusy(false);
        if (onAdvance) onAdvance();
        return;
      }
      if (cfg.type === "manual") {
        setStatus("Speaking...");
        await speak(cfg.question);
        if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
        setStatus("Listening...");
        listenChime();
        setListening(true);
        const t = await captureOnce(20000);
        setListening(false);
        stopChime();
        if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
        const low = (t || "").toLowerCase();
        setStatus("");
        setBusy(false);
        if (low.includes("next") || low.includes("continue") || low.includes("done")) { if (onAdvance) onAdvance(); }
        else { ranStepRef.current = -1; }
        return;
      }

      let localData = { ...data };
      const wrappedOnChange = (updates) => {
        if (updates.current_abilities) {
          updates = { ...updates, current_abilities: { ...(localData.current_abilities || {}), ...updates.current_abilities } };
        }
        localData = { ...localData, ...updates };
        onChange(updates);
      };
      const parts = typeof cfg.parts === "function" ? cfg.parts(localData) : (cfg.parts || []);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let transcript = "";
        for (let attempt = 0; attempt < 2 && !transcript; attempt++) {
          setStatus("Speaking...");
          const q = typeof part.question === "function" ? part.question(localData) : part.question;
          await speak(attempt === 0 ? q : "Sorry, I did not catch that. " + q);
          if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
          setStatus("Listening...");
          listenChime();
          setListening(true);
          transcript = await captureOnce(25000);
          setListening(false);
          stopChime();
          if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
        }
        if (!transcript) continue;
        setStatus("Heard: " + transcript);
        let parsed = part.mapLocal ? part.mapLocal(transcript) : null;
        if (!parsed) {
          try {
            const prompt = part.buildPrompt ? part.buildPrompt(transcript, localData) : (part.instruction + " The user said: " + transcript);
            const res = await base44.functions.invoke("openaiChat", { prompt, response_json_schema: part.schema });
            parsed = res && res.data ? res.data : null;
          } catch (e) {}
        }
        if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
        if (parsed) part.apply(parsed, wrappedOnChange);
      }

      if (cfg.finalMessage) { await speak(cfg.finalMessage); }
      else { gotItChime(); }
      if (cancelledRef.current) { setBusy(false); setStatus(""); return; }
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

  useEffect(() => {
    if (!voiceMode) teardown();
  }, [voiceMode]);

  useEffect(() => {
    return () => teardown();
  }, []);

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
      {!voiceMode && (
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} className={"inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border select-none transition-shadow " + (holding ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border") + (hintPulse ? " animate-pulse ring-2 ring-primary/60" : "")}>
            <Mic className="w-4 h-4" />
            {holding ? "Keep holding…" : "Hold to enter audio assist"}
          </button>
        </div>
      )}
      {voiceMode && (
        <>
          {listening && (
            <div onClick={finishRecording} role="button" aria-label="Tap anywhere on the screen when you are done talking" className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/80 p-6 text-center cursor-pointer">
              <Mic className="w-20 h-20 text-primary animate-pulse" />
              <p className="mt-6 text-xl font-bold text-foreground">Listening…</p>
              <p className="mt-2 text-base text-muted-foreground">Tap anywhere on the screen when you're done talking</p>
            </div>
          )}
          <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
            {status ? <span className="text-xs text-muted-foreground bg-card/90 px-2 py-1 rounded-full border border-border">{status}</span> : null}
            <button type="button" onClick={() => { if (listening) finishRecording(); }} onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} className={"inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border select-none transition-shadow " + (holding ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border") + (hintPulse ? " animate-pulse ring-2 ring-primary/60" : "")}>
              <Mic className="w-4 h-4" />
              {holding ? "Keep holding…" : "Hold to switch to typing"}
            </button>
          </div>
        </>
      )}
    </>
  );
}