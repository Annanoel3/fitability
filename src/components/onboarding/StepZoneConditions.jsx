import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2 } from "lucide-react";
import { isSpeechSupported, captureOnce, stopCapture } from "@/lib/speechEngine";

const ZONE_LABELS = {
  head: "Head / Neck",
  neck: "Neck / Upper Back",
  left_shoulder: "Left Shoulder",
  right_shoulder: "Right Shoulder",
  chest: "Chest",
  upper_back: "Upper Back",
  abdomen: "Abdomen / Core",
  lower_back: "Lower Back",
  left_arm: "Left Arm / Elbow",
  right_arm: "Right Arm / Elbow",
  left_forearm: "Left Forearm / Elbow",
  right_forearm: "Right Forearm / Elbow",
  left_wrist: "Left Wrist / Hand",
  right_wrist: "Right Wrist / Hand",
  left_hip: "Left Hip / Glute",
  right_hip: "Right Hip / Glute",
  left_thigh: "Left Thigh",
  right_thigh: "Right Thigh",
  left_knee: "Left Knee",
  right_knee: "Right Knee",
  left_calf: "Left Shin / Calf",
  right_calf: "Right Shin / Calf",
  left_foot: "Left Foot / Ankle",
  right_foot: "Right Foot / Ankle",
};

const ZONE_ICONS = {
  head: "🧠", neck: "🔙",
  left_shoulder: "💪", right_shoulder: "💪",
  chest: "❤️", upper_back: "🔙", abdomen: "🫁", lower_back: "🔙",
  left_arm: "💪", right_arm: "💪",
  left_forearm: "💪", right_forearm: "💪",
  left_wrist: "🤚", right_wrist: "🤚",
  left_hip: "🦴", right_hip: "🦴",
  left_thigh: "🦵", right_thigh: "🦵",
  left_knee: "🦵", right_knee: "🦵",
  left_calf: "🦵", right_calf: "🦵",
  left_foot: "🦶", right_foot: "🦶",
};

const PLACEHOLDERS = {
  head: "e.g. Chronic neck pain, can't turn head fully to the left...",
  left_shoulder: "e.g. Torn rotator cuff, can't raise arm above shoulder height...",
  right_shoulder: "e.g. Recent surgery, limited range of motion...",
  chest: "e.g. High blood pressure, asthma, get chest pain when exerting...",
  upper_back: "e.g. Scoliosis, can't twist torso, upper back stiffness...",
  lower_back: "e.g. Herniated disc at L4-L5, sciatica down left leg...",
  abdomen: "e.g. Hernia repair 6 months ago, can't do sit-ups...",
  left_arm: "e.g. Tennis elbow, weakness in left arm, pain bending elbow...",
  right_arm: "e.g. Prosthetic right arm, limited grip strength...",
  left_forearm: "e.g. Tendinitis, pain with repetitive motions...",
  right_forearm: "e.g. Carpal tunnel symptoms extending to forearm...",
  left_wrist: "e.g. Carpal tunnel, can't bear weight on left wrist...",
  right_wrist: "e.g. Arthritis, limited grip, wrist fracture history...",
  left_hip: "e.g. Hip replacement, limited range, can't bear full weight...",
  right_hip: "e.g. Hip arthritis, pain walking, labral tear...",
  left_thigh: "e.g. Quad weakness, pain after injury, nerve damage...",
  right_thigh: "e.g. IT band tightness, previous fracture...",
  left_knee: "e.g. ACL replacement, can't fully bend, avoid kneeling...",
  right_knee: "e.g. Arthritis, bone on bone, knee replacement...",
  left_calf: "e.g. DVT history, shin splints, calf muscle tear...",
  right_calf: "e.g. Plantar fasciitis affecting the calf, tightness...",
  left_foot: "e.g. Plantar fasciitis, ankle sprain, limited ankle mobility...",
  right_foot: "e.g. Prosthetic foot, drop foot, bunion pain...",
};

export default function StepZoneConditions({ data, onChange }) {
  const markedZones = data.marked_zones || [];
  const descriptions = data.zone_descriptions || {};
  const [activeMic, setActiveMic] = useState(null);
  const [transcribingZone, setTranscribingZone] = useState(null);
  const activeMicRef = useRef(null);
  const micSupported = isSpeechSupported();

  const handleMicResult = (zoneId, transcript) => {
    const current = (descriptions[zoneId] || "").trim();
    const merged = current ? `${current} ${transcript}` : transcript;
    onChange({
      zone_descriptions: {
        ...descriptions,
        [zoneId]: merged,
      }
    });
  };

  const toggleMic = async (zoneId) => {
    if (activeMicRef.current === zoneId) {
      // Tap to stop — immediately show transcribing spinner while the
      // captureOnce promise resolves with the transcript.
      setActiveMic(null);
      setTranscribingZone(zoneId);
      try { stopCapture(); } catch (e) {}
      return;
    }
    if (activeMicRef.current) {
      try { stopCapture(); } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
    }
    activeMicRef.current = zoneId;
    setActiveMic(zoneId);
    try {
      const transcript = await captureOnce(120000);
      if (activeMicRef.current === zoneId && transcript) {
        handleMicResult(zoneId, transcript);
      }
    } catch (e) {}
    if (activeMicRef.current === zoneId) {
      activeMicRef.current = null;
      setActiveMic(null);
    }
    setTranscribingZone(prev => (prev === zoneId ? null : prev));
  };

  useEffect(() => {
    return () => { try { stopCapture(); } catch (e) {} };
  }, []);

  if (markedZones.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-2xl">✅</p>
        <h2 className="text-xl font-heading font-bold">No areas marked</h2>
        <p className="text-muted-foreground text-sm">Continue to the next step.</p>
      </div>
    );
  }

  const handleChange = (zoneId, value) => {
    onChange({
      zone_descriptions: {
        ...descriptions,
        [zoneId]: value,
      }
    });
  };

  const renderMicButton = (zoneId) => {
    const isActive = activeMic === zoneId;
    const isTranscribing = transcribingZone === zoneId;
    return (
      <button
        type="button"
        onClick={() => toggleMic(zoneId)}
        disabled={isTranscribing}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
          isActive ? "text-red-500" : isTranscribing ? "text-muted-foreground" : "text-[#4169E1]"
        }`}
      >
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
          isActive
            ? "bg-red-500 text-white animate-pulse"
            : isTranscribing
              ? "bg-muted text-muted-foreground"
              : "bg-[#4169E1] text-white hover:bg-[#4169E1]/90"
        }`}>
          {isActive ? <Square className="w-4 h-4" /> : isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        </span>
        {isActive ? "Stop" : isTranscribing ? "Transcribing…" : "Speak"}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Tell us about each area</h2>
        <p className="text-primary font-medium mt-3 text-base">
          ✏️ Put EVERYTHING here — all your conditions, injuries, and limitations. Our AI uses this to keep unsafe exercises out of your plan.
        </p>
      </div>

      <div className="space-y-4">
        {markedZones.map(zoneId => {
          const label = ZONE_LABELS[zoneId] || zoneId;
          const icon = ZONE_ICONS[zoneId] || "📍";
          const placeholder = PLACEHOLDERS[zoneId] || "Describe what's wrong with this area...";
          const value = descriptions[zoneId] || "";

          return (
            <div key={zoneId} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary/40 border-b border-border">
                <span className="text-lg">{icon}</span>
                <span className="font-semibold text-sm text-foreground">{label}</span>
                {value.trim() && (
                  <span className="ml-auto bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                    ✓ Described
                  </span>
                )}
              </div>
              <div className="p-4">
                <Textarea
                  value={value}
                  onChange={(e) => handleChange(zoneId, e.target.value)}
                  placeholder={"Type here… " + placeholder}
                  className="resize-none text-sm min-h-[80px] bg-background"
                  rows={3}
                />
                {micSupported && (
                  <div className="mt-3">
                    {renderMicButton(zoneId)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-secondary/40 border-b border-border">
          <span className="text-lg">💬</span>
          <span className="font-semibold text-sm text-foreground">Anything else the AI should know?</span>
        </div>
        <div className="p-4">
          <Textarea
            value={descriptions["_extra"] || ""}
            onChange={(e) => handleChange("_extra", e.target.value)}
            placeholder="Type here… e.g. I get dizzy when I stand up too fast, I've had a recent surgery, I'm recovering from COVID, I use a cane..."
            className="resize-none text-sm min-h-[80px] bg-background"
            rows={3}
          />
          {micSupported && (
            <div className="mt-3">
              {renderMicButton("_extra")}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        You can leave areas blank — even a little detail helps.
      </p>
    </div>
  );
}