import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages TTS audio playback and optional voice command recognition for workouts.
 * - Uses GenerateSpeech for high-quality stored MP3s (cached by exercise name).
 * - Uses Web Speech API for voice commands: "next", "done", "skip", "back".
 * - noisyMode: skip mic entirely, user taps buttons manually.
 */
export function useWorkoutAudio({ exercises, onNext, onBack, noisyMode }) {
  const [audioMode, setAudioMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listeningForVoice, setListeningForVoice] = useState(false);
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

  const speak = useCallback(async (text, cacheKey) => {
    stopAudio();
    setSpeaking(true);
    try {
      let audioUrl = null;

      if (cacheKey) {
        const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: `audio_${cacheKey}` });
        if (cached.length > 0) audioUrl = cached[0].image_url;
      }

      if (!audioUrl) {
        const result = await base44.integrations.Core.GenerateSpeech({
          text,
          voice: "sunny", // energetic, upbeat — great for fitness coaching
        });
        audioUrl = result.url;
        if (cacheKey) {
          await base44.entities.ExerciseImage.create({ exercise_name_key: `audio_${cacheKey}`, image_url: audioUrl });
        }
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.15; // slightly faster — natural, not slow
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e) {
      setSpeaking(false);
    }
  }, [stopAudio]);

  const speakWelcome = useCallback((workoutTitle) => {
    const text = `Welcome to today's workout: ${workoutTitle}! I'll guide you through each exercise. When you're ready to move on, just say "next" or "done". Say "back" to repeat the previous exercise. Let's get started — expand the first exercise whenever you're ready!`;
    return speak(text, `welcome_${workoutTitle}`);
  }, [speak]);

  const speakExercise = useCallback(async (idx) => {
    if (!exercises || !exercises[idx]) return;
    const ex = exercises[idx];
    activeIdxRef.current = idx;
    const isLast = idx === exercises.length - 1;
    const position = isLast ? "This is your last exercise. " : "";
    const text = `Exercise ${idx + 1}: ${ex.name}. ${ex.sets ? `${ex.sets} sets` : ""} ${ex.reps ? `of ${ex.reps} reps.` : ex.duration_seconds ? `for ${ex.duration_seconds} seconds.` : ""} ${ex.instructions || ex.description || ""} ${position}`;
    await speak(text, ex.name);
  }, [exercises, speak]);

  // Voice recognition
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
      if (recognitionRef.current) {
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
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningForVoice(false);
  }, []);

  const enableAudioMode = useCallback(() => {
    setAudioMode(true);
  }, []);

  const disableAudioMode = useCallback(() => {
    stopAudio();
    stopListening();
    setAudioMode(false);
  }, [stopAudio, stopListening]);

  // Start/stop listening when audioMode or noisyMode changes
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
    stopAudio,
    speaking,
    listeningForVoice,
    voiceSupported,
  };
}