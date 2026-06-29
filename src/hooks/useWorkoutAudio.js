import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages TTS audio playback and voice command recognition for workouts.
 *
 * Key design decisions for mobile/iOS compatibility:
 * - Uses NON-continuous recognition with manual restart-on-end (continuous=true crashes WKWebView)
 * - Stops listening while speaking, restarts immediately after speech ends
 * - Handles all voice commands including "repeat", "what can I say", etc.
 */
export function useWorkoutAudio({ exercises, userRestrictions = [], onNext, onSkip, onBack, noisyMode, onRepeat, onCommandDetected }) {
  const [audioMode, setAudioMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [listeningForFeedback, setListeningForFeedback] = useState(false);
  const [voiceSupported] = useState(() => {
    try {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    } catch (e) { return false; }
  });

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeIdxRef = useRef(null);
  const audioModeRef = useRef(false);
  const noisyRef = useRef(noisyMode);
  const speakingRef = useRef(false);
  const listeningStoppedRef = useRef(false); // true = intentionally stopped, don't restart
  const speakIdRef = useRef(0); // incremented each speak() call — only the latest one plays

  useEffect(() => { noisyRef.current = noisyMode; }, [noisyMode]);
  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);

  const stopAudio = useCallback(() => {
    speakIdRef.current++; // invalidate any in-flight speak() so it won't play after stop
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  // Completely stop recognition — no restart
  const stopListening = useCallback(() => {
    listeningStoppedRef.current = true;
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try { r.abort(); } catch (e) {}
    }
    setListening(false);
  }, []);

  // Start a single (non-continuous) recognition session. On end, auto-restarts
  // unless listeningStoppedRef is true or we're currently speaking.
  const startOneShot = useCallback((onResult) => {
    if (!voiceSupported || noisyRef.current || listeningStoppedRef.current) return;

    let SpeechRecognition;
    try {
      SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    } catch (e) { return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;       // CRITICAL: must be false on iOS/WKWebView
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("[Voice] Heard:", transcript);
      onResult(transcript);
    };

    recognition.onerror = () => {
      // Silently ignore — onend will handle restart
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setListening(false);
      // Auto-restart unless intentionally stopped or currently speaking
      if (!listeningStoppedRef.current && !speakingRef.current && audioModeRef.current) {
        setTimeout(() => {
          if (!listeningStoppedRef.current && !speakingRef.current && audioModeRef.current) {
            startOneShot(onResult);
          }
        }, 300);
      }
    };

    recognition.onstart = () => {
      setListening(true);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      // start() can throw if already started or not allowed — clean up
      recognitionRef.current = null;
      setListening(false);
    }
  }, [voiceSupported]);

  // The command handler — passed to startOneShot
  const commandHandlerRef = useRef(null);

  // Core speak — generates TTS, caches it, plays back
  // Stops listening before speaking, restarts listening after
  const speak = useCallback((text, cacheKey) => {
    return new Promise(async (resolve) => {
      // Pause listening while speaking
      if (recognitionRef.current) {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        r.onend = null;
        r.onresult = null;
        try { r.abort(); } catch (e) {}
        setListening(false);
      }

      stopAudio(); // invalidates any prior in-flight speak()
      const myId = ++speakIdRef.current; // capture AFTER stopAudio so this call is the newest
      speakingRef.current = true;
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

        // A newer speak() call superseded this one — abandon without playing
        if (speakIdRef.current !== myId) {
          resolve();
          return;
        }

        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.15;
        audioRef.current = audio;

        const finish = () => {
          if (speakIdRef.current !== myId) { resolve(); return; }
          speakingRef.current = false;
          setSpeaking(false);
          // Resume listening after speaking (if still in audio mode and voice not noisy)
          if (!listeningStoppedRef.current && audioModeRef.current && !noisyRef.current && commandHandlerRef.current) {
            setTimeout(() => {
              if (!listeningStoppedRef.current && audioModeRef.current && !noisyRef.current) {
                startOneShot(commandHandlerRef.current);
              }
            }, 300);
          }
          resolve();
        };

        audio.onended = finish;
        audio.onerror = finish;
        await audio.play();
      } catch (e) {
        if (speakIdRef.current === myId) {
          speakingRef.current = false;
          setSpeaking(false);
        }
        resolve();
      }
    });
  }, [stopAudio, startOneShot]);

  const speakWelcome = useCallback((workoutTitle) => {
    const text = `Welcome to ${workoutTitle}! I'll read each exercise out loud as you go. Here's what you can say at any time: "next" or "done" to complete and move on. "skip" if an exercise isn't right for you today. "back" to go to the previous exercise. "repeat" to hear the instructions again. And "commands" to hear this list again. You can also tap the on-screen buttons at any time. Let's get started!`;
    return speak(text, null);
  }, [speak]);

  const speakExercise = useCallback(async (idx) => {
    if (!exercises || !exercises[idx]) return;
    const ex = exercises[idx];
    activeIdxRef.current = idx;
    const isLast = idx === exercises.length - 1;
    const lastNote = isLast ? " This is your last exercise — great work, almost there!" : "";
    
    // Check if this exercise has restrictions matching the user's profile
    const matchingRestrictions = (ex.restriction_tags || []).filter(tag => userRestrictions.includes(tag));
    const restrictionNote = matchingRestrictions.length > 0
      ? ` I know you have ${matchingRestrictions.map(tag => tag.replace(/_/g, ' ')).join(' and ')}, so if this is giving you too much trouble, feel free to skip or modify.`
      : "";
    
    const text = `Exercise ${idx + 1}: ${ex.name}. ${ex.sets ? `${ex.sets} sets` : ""} ${ex.reps ? `of ${ex.reps} reps.` : ex.duration_seconds ? `for ${ex.duration_seconds} seconds.` : ""} ${ex.instructions || ex.description || ""}${restrictionNote}${lastNote}`;
    await speak(text, ex.name);
  }, [exercises, userRestrictions, speak]);

  const speakCommands = useCallback(() => {
    const text = `Here are the commands you can say: "next" or "done" to complete an exercise and move on. "skip" to skip an exercise without counting it. "back" to go to the previous exercise. "repeat" to hear the current exercise again. "commands" to hear this list again.`;
    return speak(text, null);
  }, [speak]);

  // Build and register the command handler whenever exercises/callbacks change
  useEffect(() => {
    commandHandlerRef.current = (transcript) => {
      // "ignore" / "cancel" / "mistake" / "never mind" — user is correcting a mishear
      if (
        transcript.includes("ignore") || transcript.includes("cancel") ||
        transcript.includes("mistake") || transcript.includes("never mind") ||
        transcript.includes("nevermind") || transcript.includes("didn't say") ||
        transcript.includes("i didn't") || transcript.includes("not that") ||
        transcript.includes("wrong") || transcript.includes("no no") ||
        transcript.includes("stop") || transcript.includes("undo")
      ) {
        // Nothing to undo at this point — just acknowledge and keep listening
        if (onCommandDetected) onCommandDetected(null); // clear any pending confirmation
        return;
      }

      let label = null;
      let action = null;

      if (transcript.includes("skip")) {
        label = "skip";
        action = () => { stopAudio(); onSkip(activeIdxRef.current); };
      } else if (transcript.includes("next") || transcript.includes("done") || transcript.includes("finish")) {
        label = "next";
        action = () => { stopAudio(); onNext(activeIdxRef.current); };
      } else if (transcript.includes("back") || transcript.includes("previous")) {
        label = "back";
        action = () => { stopAudio(); onBack(activeIdxRef.current); };
      } else if (transcript.includes("repeat") || transcript.includes("again") || transcript.includes("say that") || transcript.includes("instructions")) {
        label = "repeat";
        action = () => { stopAudio(); if (onRepeat) onRepeat(activeIdxRef.current); };
      } else if (transcript.includes("command") || transcript.includes("what can i say") || transcript.includes("help")) {
        label = "commands";
        action = () => { stopAudio(); speakCommands(); };
      }

      if (action && label) {
        // Surface the detected command to the UI so user can cancel within a short window
        console.log("[Command] Detected:", label, "from:", transcript);
        if (onCommandDetected) onCommandDetected({ label, action, transcript });
      } else {
        console.log("[Command] No match for:", transcript);
      }
      // Unknown transcript — keep listening silently
    };
  }, [exercises, onNext, onSkip, onBack, onRepeat, onCommandDetected, stopAudio, speakCommands]);

  // Start continuous (restart-on-end) listening
  const startListening = useCallback(() => {
    if (!voiceSupported || noisyRef.current) return;
    listeningStoppedRef.current = false;
    if (commandHandlerRef.current) {
      startOneShot(commandHandlerRef.current);
    }
  }, [voiceSupported, startOneShot]);

  const askForFeedback = useCallback(async () => {
    const promptText = "Great job today — let's do this again real soon! Since we're always looking to improve, may I ask how your workout went? If you had to rate it one to five stars, what would you give it, and why? Feel free to share — or just say skip if you'd rather not.";
    await speak(promptText, null);

    if (!voiceSupported || noisyRef.current) return null;

    return new Promise((resolve) => {
      let SpeechRecognition;
      try {
        SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      } catch (e) { resolve(null); return; }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
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
        try { recognition.abort(); } catch (e) {}
        setListeningForFeedback(false);
        resolve(transcript || null);
      };

      const timeout = setTimeout(() => finish(null), 20000);
      recognition.onresult = (e) => {
        clearTimeout(timeout);
        const t = e.results[0][0].transcript;
        // Treat "skip", "no", "pass", "never mind" as opting out
        const lower = t.toLowerCase().trim();
        if (lower === "skip" || lower === "no" || lower === "pass" || lower === "never mind" || lower === "nevermind" || lower === "no thanks") {
          finish(null);
        } else {
          finish(t);
        }
      };
      recognition.onerror = () => { clearTimeout(timeout); finish(null); };
      recognition.onend = () => { clearTimeout(timeout); finish(null); };

      setListeningForFeedback(true);
      try { recognition.start(); } catch (e) { finish(null); }
    });
  }, [speak, voiceSupported]);

  const enableAudioMode = useCallback(() => {
    listeningStoppedRef.current = false;
    setAudioMode(true);
    audioModeRef.current = true;
  }, []);

  const disableAudioMode = useCallback(() => {
    stopAudio();
    stopListening();
    setAudioMode(false);
    audioModeRef.current = false;
  }, [stopAudio, stopListening]);

  // Start listening when audio mode is enabled (and voice is on)
  useEffect(() => {
    if (audioMode && !noisyMode && voiceSupported) {
      listeningStoppedRef.current = false;
      // Small delay so welcome speech can start first
      const t = setTimeout(() => {
        if (audioModeRef.current && !noisyRef.current && !speakingRef.current && commandHandlerRef.current) {
          startOneShot(commandHandlerRef.current);
        }
      }, 500);
      return () => clearTimeout(t);
    } else if (!audioMode) {
      stopListening();
    }
  }, [audioMode, noisyMode, voiceSupported, startOneShot, stopListening]);

  // Cleanup on unmount
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
    speakCommands,
    askForFeedback,
    stopAudio,
    stopListening,
    startListening,
    speaking,
    listening,
    listeningForFeedback,
    voiceSupported,
  };
}