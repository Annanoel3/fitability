import { useState, useRef, useCallback } from "react";

/**
 * Browser-based speech-to-text using the Web Speech API (SpeechRecognition).
 * Uses non-continuous (one-shot) mode for Android/WKWebView compatibility —
 * the same pattern used in useWorkoutAudio.
 * Returns: { supported, listening, error, start, stop, toggle }
 * Pass `onResult(transcript)` to receive final transcripts.
 */
export function useSpeechToText({ onResult } = {}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const shouldListenRef = useRef(false); // true = user wants mic on, keep restarting

  const supported = !!(
    (typeof window !== "undefined") &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const startOneShot = useCallback(() => {
    if (!shouldListenRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;       // CRITICAL: must be false on Android/WKWebView
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && onResultRef.current) {
        onResultRef.current(transcript.trim());
      }
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setError("Mic permission denied (" + e.error + ")");
      } else if (e.error === "audio-capture") {
        shouldListenRef.current = false;
        setError("No microphone found");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("Voice error: " + e.error);
      }
      // no-speech / aborted are normal — onend will restart
    };

    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setListening(false);
      // Auto-restart if user still wants the mic on
      if (shouldListenRef.current) {
        setTimeout(() => { if (shouldListenRef.current) startOneShot(); }, 250);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      recognitionRef.current = null;
      setListening(false);
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    shouldListenRef.current = true;
    startOneShot();
  }, [startOneShot]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      recognitionRef.current = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.abort(); } catch {}
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (shouldListenRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported, listening, error, start, stop, toggle };
}