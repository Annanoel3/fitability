import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

// Map zone id → relevant condition options
const ZONE_CONDITIONS = {
  head: [
    "Neck pain (chronic)", "Cervical herniated disc", "Limited neck rotation",
    "Neck surgery (recent)", "Whiplash injury", "Vertigo / dizziness",
    "Traumatic brain injury", "Concussion history", "Cannot turn head fully"
  ],
  left_shoulder: [
    "Left shoulder pain", "Torn rotator cuff (left)", "Left shoulder replacement",
    "Left shoulder surgery (recent)", "Cannot raise left arm overhead",
    "Limited left shoulder range of motion"
  ],
  right_shoulder: [
    "Right shoulder pain", "Torn rotator cuff (right)", "Right shoulder replacement",
    "Right shoulder surgery (recent)", "Cannot raise right arm overhead",
    "Limited right shoulder range of motion"
  ],
  chest: [
    "Heart disease", "High blood pressure", "Heart failure",
    "Post-cardiac surgery", "Exercise-induced chest pain",
    "COPD", "Asthma", "Oxygen dependent"
  ],
  upper_back: [
    "Upper back pain", "Scoliosis", "Spinal stenosis",
    "Cannot twist torso", "Post-spinal surgery"
  ],
  lower_back: [
    "Lower back pain", "Herniated disc", "Sciatica",
    "Spinal fusion surgery", "Cannot bend at waist",
    "Cannot lie flat on back", "Spinal stenosis"
  ],
  left_arm: [
    "Left elbow pain", "Tennis elbow (left)", "Left arm weakness",
    "Uses prosthetic (left arm)", "Amputee (upper left)"
  ],
  right_arm: [
    "Right elbow pain", "Tennis elbow (right)", "Right arm weakness",
    "Uses prosthetic (right arm)", "Amputee (upper right)"
  ],
  left_wrist: [
    "Left wrist pain", "Carpal tunnel (left)", "Cannot grip with left hand",
    "Cannot bear weight on left wrist", "Wrist fracture / surgery (left)",
    "Arthritis in left hand"
  ],
  right_wrist: [
    "Right wrist pain", "Carpal tunnel (right)", "Cannot grip with right hand",
    "Cannot bear weight on right wrist", "Wrist fracture / surgery (right)",
    "Arthritis in right hand"
  ],
  abdomen: [
    "Hernia", "Post-abdominal surgery", "Cannot do sit-ups / crunches",
    "Diastasis recti", "Ostomy / colostomy present", "Weak core"
  ],
  left_hip: [
    "Left hip pain", "Hip replacement (left)", "Hip arthritis (left)",
    "Hip labral tear (left)", "Hip surgery (recent, left)",
    "Cannot bear weight on left leg", "Limited hip range (left)"
  ],
  right_hip: [
    "Right hip pain", "Hip replacement (right)", "Hip arthritis (right)",
    "Hip labral tear (right)", "Hip surgery (recent, right)",
    "Cannot bear weight on right leg", "Limited hip range (right)"
  ],
  left_knee: [
    "Left knee pain", "Left knee arthritis", "Left knee replacement",
    "Torn ACL / meniscus (left)", "Left knee surgery (recent)",
    "Cannot fully bend left knee", "Cannot kneel on left knee"
  ],
  right_knee: [
    "Right knee pain", "Right knee arthritis", "Right knee replacement",
    "Torn ACL / meniscus (right)", "Right knee surgery (recent)",
    "Cannot fully bend right knee", "Cannot kneel on right knee"
  ],
  left_ankle: [
    "Left ankle pain / sprain", "Plantar fasciitis (left)",
    "Foot surgery (recent, left)", "Limited ankle mobility (left)",
    "Uses prosthetic (lower left)", "Amputee (lower left)"
  ],
  right_ankle: [
    "Right ankle pain / sprain", "Plantar fasciitis (right)",
    "Foot surgery (recent, right)", "Limited ankle mobility (right)",
    "Uses prosthetic (lower right)", "Amputee (lower right)"
  ],
};

const ZONE_LABELS = {
  head: "Head / Neck",
  left_shoulder: "Left Shoulder",
  right_shoulder: "Right Shoulder",
  chest: "Chest",
  upper_back: "Upper Back",
  lower_back: "Lower Back",
  left_arm: "Left Arm / Elbow",
  right_arm: "Right Arm / Elbow",
  left_wrist: "Left Wrist / Hand",
  right_wrist: "Right Wrist / Hand",
  abdomen: "Abdomen / Core",
  left_hip: "Left Hip",
  right_hip: "Right Hip",
  left_knee: "Left Knee",
  right_knee: "Right Knee",
  left_ankle: "Left Ankle / Foot",
  right_ankle: "Right Ankle / Foot",
};

const ZONE_ICONS = {
  head: "🫀", left_shoulder: "💪", right_shoulder: "💪",
  chest: "❤️", upper_back: "🔙", lower_back: "🔙",
  left_arm: "💪", right_arm: "💪", left_wrist: "🤚", right_wrist: "🤚",
  abdomen: "🫁", left_hip: "🦴", right_hip: "🦴",
  left_knee: "🦵", right_knee: "🦵", left_ankle: "🦶", right_ankle: "🦶",
};

export default function StepZoneConditions({ data, onChange }) {
  const markedZones = data.marked_zones || [];
  const selected = data.disabilities || [];
  const [openZone, setOpenZone] = useState(markedZones[0] || null);

  if (markedZones.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-2xl">✅</p>
        <h2 className="text-xl font-heading font-bold">No areas marked</h2>
        <p className="text-muted-foreground text-sm">Continue to the next step.</p>
      </div>
    );
  }

  const toggle = (condition) => {
    const next = selected.includes(condition)
      ? selected.filter(c => c !== condition)
      : [...selected, condition];
    onChange({ disabilities: next });
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Describe each area</h2>
        <p className="text-muted-foreground mt-2 text-sm">Tap each marked area and select what applies.</p>
      </div>

      <div className="space-y-2">
        {markedZones.map(zoneId => {
          const conditions = ZONE_CONDITIONS[zoneId] || [];
          const label = ZONE_LABELS[zoneId] || zoneId;
          const icon = ZONE_ICONS[zoneId] || "📍";
          const isOpen = openZone === zoneId;
          const count = conditions.filter(c => selected.includes(c)).length;

          return (
            <div
              key={zoneId}
              className={`rounded-xl border overflow-hidden transition-all ${
                isOpen ? "border-primary/50 shadow-sm" : count > 0 ? "border-primary/30" : "border-border"
              }`}
            >
              <button
                onClick={() => setOpenZone(prev => prev === zoneId ? null : zoneId)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors ${
                  isOpen ? "bg-secondary/60" : "bg-card hover:bg-muted/40"
                }`}
              >
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{label}</span>
                    {count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count > 0 ? `${count} condition${count > 1 ? "s" : ""} selected` : "Tap to specify"}
                    </p>
                  )}
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="grid grid-cols-1 gap-1.5 px-4 py-3 bg-muted/20 border-t border-border">
                  {conditions.map(condition => {
                    const active = selected.includes(condition);
                    return (
                      <button
                        key={condition}
                        onClick={() => toggle(condition)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? "border-primary bg-secondary"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          active ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                        }`}>
                          {active && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-sm font-medium">{condition}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}