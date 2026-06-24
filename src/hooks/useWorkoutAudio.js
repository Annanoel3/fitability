import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages TTS audio playback and optional voice command recognition for workouts.
 * - Uses GenerateSpeech for high-quality audio (cached by exercise name).
 * - Uses Web Speech API for voice commands: "done", "next", "skip".
 */
export function useWorkoutAudio({ exercises, onNext, onDone }) {
  const [audioMode, setAudioMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listeningForVoice, setListeningForVoice] = useState(false);
  const [voiceSupported] = useState(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeIdxRef = useRef(null);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  // Speak a text string — checks cache, generates if needed
  const speak = useCallback(async (text, exerciseName) => {
    stopAudio();
    setSpeaking(true);
    try {
      let audioUrl = null;

      // Check cache
      if (exerciseName) {
        const key = `audio_${exerciseName.toLowerCase().trim()}`;
        const cached = await base44.entities.ExerciseImage.filter({ exercise_name_key: key });
        if (cached.length > 0) {
          audioUrl = cached[0].image_url;
        }
      }

      // Generate if not cached
      if (!audioUrl) {
        const result = await base44.integrations.Core.GenerateSpeech({
          text,
          voice: "river", // calm, neutral — best for fitness coaching
        });
        audioUrl = result.url;
        // Cache it
        if (exerciseName) {
          const key = `audio_${exerciseName.toLowerCase().trim()}`;
          await base44.entities.ExerciseImage.create({ exercise_name_key: key, image_url: audioUrl });
        }
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e) {
      setSpeaking(false);
    }
  }, [stopAudio]);

  // Speak instructions for a given exercise index
  const speakExercise = useCallback(async (idx) => {
    if (!exercises || !exercises[idx]) return;
    const ex = exercises[idx];
    activeIdxRef.current = idx;
    const text = `Exercise ${idx + 1}: ${ex.name}. ${ex.sets ? `${ex.sets} sets` : ""} ${ex.reps ? `of ${ex.reps} reps.` : ex.duration_seconds ? `for ${ex.duration_seconds} seconds.` : ""} ${ex.instructions || ex.description || ""}`;
    await speak(text, ex.name);
  }, [exercises, speak]);

  // Voice recognition setup
  const startListening = useCallback(() => {
    if (!voiceSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (transcript.includes("done") || transcript.includes("next") || transcript.includes("skip")) {
        stopAudio();
        onNext(activeIdxRef.current);
      }
    };

    recognition.onerror = () => setListeningForVoice(false);
    recognition.onend = () => {
      // Restart if still in audio mode
      if (recognitionRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListeningForVoice(true);
    } catch (e) {}
  }, [voiceSupported, stopAudio, onNext]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningForVoice(false);
  }, []);

  // Toggle audio mode on/off
  const toggleAudioMode = useCallback(() => {
    setAudioMode(prev => {
      if (prev) {
        stopAudio();
        stopListening();
        return false;
      }
      return true;
    });
  }, [stopAudio, stopListening]);

  // When audio mode turns on, start voice listening
  useEffect(() => {
    if (audioMode && voiceSupported) {
      startListening();
    } else {
      stopListening();
    }
  }, [audioMode, voiceSupported, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      stopListening();
    };
  }, [stopAudio, stopListening]);

  return {
    audioMode,
    toggleAudioMode,
    speakExercise,
    stopAudio,
    speaking,
    listeningForVoice,
    voiceSupported,
  };
}