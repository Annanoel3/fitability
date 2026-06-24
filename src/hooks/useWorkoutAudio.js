import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages TTS audio playback and optional voice command recognition for workouts.
 * - Uses GenerateSpeech for high-quality stored MP3s (cached by exercise name).
 * - Uses Web Speech API for voice commands: "next", "done", "skip", "back".
 * - noisyMode: skip mic entirely, user taps buttons manually.
 * - Capacitor-safe: uses restart-on-end for continuous listening (handles WKWebView quirks).
 */
export function useWorkoutAudio({ exercises, onNext, onBack, noisyMode }) {
  const [audioMode, setAudioMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listeningForVoice, setListeningForVoice] = useState(false);
  const [listeningForFeedback, setListeningForFeedback] = useState(false);
  const [voiceSupported] = useState(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeIdxRef = useRef(null);
  const noisyRef = useRef(noisyMode);
  useEffect(() => { noisyRef.current = noisyMode; }, [noisyMode]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  // Core speak — generates TTS audio, caches it, plays at 1.15x speed
  // Returns a Promise that resolves when audio finishes playing
  const speak = useCallback((text, cacheKey) => {
    return new Promise(async (resolve) => {
      stopAudio();
      setSpeaking(true);
      try {
        let audioUrl = null;
        if (cacheKey) {
          const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: `audio_${cacheKey}` });
          if (cached.length > 0) audioUrl = cached[0].image_url;
        }
        if (!audioUrl) {
          const result = await base44.integrations.Core.GenerateSpeech({ text, voice: "sunny" });
          audioUrl = result.url;
          if (cacheKey) {
            await base44.entities.ExerciseImage.create({ exercise_name_key: `audio_${cacheKey}`, image_url: audioUrl });
          }
        }
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.15;
        audioRef.current = audio;
        audio.onended = () => { setSpeaking(false); resolve(); };
        audio.onerror = () => { setSpeaking(false); resolve(); };
        await audio.play();
      } catch (e) {
        setSpeaking(false);
        resolve();
      }
    });
  }, [stopAudio]);

  const speakWelcome = useCallback((workoutTitle) => {
    const text = `Welcome to today's workout: ${workoutTitle}! I'll guide you through each exercise. When you're ready to move on, just say "next" or "done". Say "back" to go to the previous exercise. Let's get started — expand the first exercise whenever you're ready!`;
    return speak(text, `welcome_${workoutTitle}`);
  }, [speak]);

  const speakExercise = useCallback(async (idx) => {
    if (!exercises || !exercises[idx]) return;
    const ex = exercises[idx];
    activeIdxRef.current = idx;
    const isLast = idx === exercises.length - 1;
    const lastNote = isLast ? " This is your last exercise — great work, almost there!" : "";
    const text = `Exercise ${idx + 1}: ${ex.name}. ${ex.sets ? `${ex.sets} sets` : ""} ${ex.reps ? `of ${ex.reps} reps.` : ex.duration_seconds ? `for ${ex.duration_seconds} seconds.` : ""} ${ex.instructions || ex.description || ""}${lastNote}`;
    await speak(text, ex.name);
  }, [exercises, speak]);

  // Speaks the end-of-workout prompt, then listens for a natural voice response.
  // Returns the raw transcript string, or null if nothing heard / not supported.
  const askForFeedback = useCallback(async () => {
    const promptText = "Amazing job finishing your workout! How did it feel? Go ahead and tell me in your own words — something like it was great, or pretty tough today, or give it a rating out of five. I am listening!";
    await speak(promptText, null); // never cache — it's a live prompt

    if (!voiceSupported || noisyRef.current) return null;

    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;      // one-shot — more reliable on WKWebView
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      let resolved = false;
      const finish = (transcript) => {
        if (resolved) return;
        resolved = true;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try { recognition.stop(); } catch (e) {}
        setListeningForFeedback(false);
        resolve(transcript || null);
      };

      const timeout = setTimeout(() => finish(null), 12000);

      recognition.onresult = (e) => {
        clearTimeout(timeout);
        finish(e.results[0][0].transcript);
      };
      recognition.onerror = () => { clearTimeout(timeout); finish(null); };
      recognition.onend = () => { clearTimeout(timeout); finish(null); };

      setListeningForFeedback(true);
      try { recognition.start(); } catch (e) { finish(null); }
    });
  }, [speak, voiceSupported]);

  // Continuous nav listening — restarts on end to handle WKWebView stopping silently
  const startListening = useCallback(() => {
    if (!voiceSupported || noisyRef.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (transcript.includes("next") || transcript.includes("done") || transcript.includes("skip")) {
        stopAudio();
        onNext(activeIdxRef.current);
      } else if (transcript.includes("back") || transcript.includes("previous")) {
        stopAudio();
        onBack(activeIdxRef.current);
      }
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      // Auto-restart to handle WKWebView / Android stopping recognition silently
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListeningForVoice(true);
    } catch (e) {}
  }, [voiceSupported, stopAudio, onNext, onBack]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null; // clear first so onend doesn't restart
      r.onend = null;
      try { r.stop(); } catch (e) {}
    }
    setListeningForVoice(false);
  }, []);

  const enableAudioMode = useCallback(() => setAudioMode(true), []);

  const disableAudioMode = useCallback(() => {
    stopAudio();
    stopListening();
    setAudioMode(false);
  }, [stopAudio, stopListening]);

  useEffect(() => {
    if (audioMode && !noisyMode && voiceSupported) {
      startListening();
    } else {
      stopListening();
    }
  }, [audioMode, noisyMode, voiceSupported, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopAudio();
      stopListening();
    };
  }, [stopAudio, stopListening]);

  return {
    audioMode,
    enableAudioMode,
    disableAudioMode,
    speakExercise,
    speakWelcome,
    askForFeedback,
    stopAudio,
    stopListening,
    speaking,
    listeningForVoice,
    listeningForFeedback,
    voiceSupported,
  };
}