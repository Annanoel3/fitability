import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { isSpeechSupported, recordAndTranscribe } from "@/lib/speechEngine";
import { Mic } from "lucide-react";

const _ttsCache = {};

const VOICE_STEPS = {
  0: {
    question: "Are you a veteran? You can just say yes, or no.",
    windowMs: 4000,
    mapLocal: (t) => {
      const s = (t || "").toLowerCase();
      const no = s.includes("no") || s.includes("nope") || s.includes("nah");
      const yes = s.includes("yes") || s.includes("yeah") || s.includes("yep") || s.includes("yup") || s.includes("i served") || s.includes("i did");
      if (yes && !no) return { is_veteran: true };
      if (no && !yes) return { is_veteran: false };
      return null;
    },
    schema: { type: "object", properties: { is_veteran: { type: "boolean" } }, required: ["is_veteran"] },
    instruction: "The user is being asked if they are a military veteran. Set is_veteran to true if they indicate yes or that they served, otherwise false.",
    apply: (p, onChange) => onChange({ is_veteran: !!p.is_veteran }),
    confirm: (p) => (p.is_veteran ? "Thank you for your service." : "Got it, not a veteran."),
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

export default function VoiceOnboarding({ step, onChange, onAdvance }) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const ranStepRef = useRef(-1);

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

  const runStep = async () => {
    const cfg = VOICE_STEPS[step];
    if (!cfg) return;
    setBusy(true);
    try {
      setStatus("Speaking...");
      await speak(cfg.question);
      setStatus("Listening...");
      playChime();
      const transcript = await recordAndTranscribe(cfg.windowMs || 6000);
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
          const res = await base44.functions.invoke("openaiChat", {
            prompt: cfg.instruction + " The user said: " + transcript,
            response_json_schema: cfg.schema,
          });
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
      await speak(cfg.confirm(parsed));
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
    <div className="mb-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => setVoiceMode((v) => !v)}
        className={"inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border " + (voiceMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border")}
      >
        <Mic className="w-4 h-4" />
        {voiceMode ? "Voice on — listening" : "Answer out loud"}
      </button>
      {voiceMode && status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
    </div>
  );
}