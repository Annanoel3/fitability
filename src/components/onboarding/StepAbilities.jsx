import React from "react";
import { ABILITIES_CHECKLIST, ABILITIES_CHECKLIST_ATHLETIC } from "@/lib/constants";

// Map abilities to relevant pain areas (used for filtering in the adaptive tier)
const ABILITY_PAIN_MAP = {
  stand_from_chair: ["left_knee", "right_knee", "left_hip", "right_hip", "lower_back"],
  walk_stairs: ["left_knee", "right_knee", "left_hip", "right_hip", "left_foot", "right_foot"],
  lift_5_lbs: ["left_shoulder", "right_shoulder", "left_wrist", "right_wrist"],
  lift_10_lbs: ["left_shoulder", "right_shoulder", "left_wrist", "right_wrist"],
  reach_overhead: ["left_shoulder", "right_shoulder", "neck", "upper_back"],
  balance_one_foot: ["left_knee", "right_knee", "left_foot", "right_foot", "left_ankle", "right_ankle"],
  walk_10_min: ["left_knee", "right_knee", "left_foot", "right_foot", "left_ankle", "right_ankle", "lower_back"],
  get_up_from_floor: ["left_knee", "right_knee", "left_hip", "right_hip", "lower_back"],
  carry_groceries: ["left_shoulder", "right_shoulder", "left_wrist", "right_wrist"],
  open_jar: ["left_wrist", "right_wrist", "left_hand", "right_hand"]
};

// Determine whether the user is more capable (athletic) or needs adaptive questions
function isAthleticTier(data) {
  const activityLevel = data.activity_level || "";
  const athleticLevels = ["Light activity", "Moderate activity", "Active"];
  if (!athleticLevels.includes(activityLevel)) return false;

  const disabilities = (data.disabilities || []);
  const bodyLimitations = (data.body_limitations || []);
  const painAreas = data.pain_areas || {};

  // If they have significant disabilities, use adaptive questions
  const severeLimitations = [
    "wheelchair", "paralysis", "amputee", "cannot stand", "bedridden",
    "stroke", "parkinson", "multiple sclerosis", "cerebral palsy"
  ];
  const hasSevereDisability = disabilities.some(d =>
    severeLimitations.some(s => d.toLowerCase().includes(s))
  );
  if (hasSevereDisability) return false;

  // If they have many body limitations, adaptive
  if (bodyLimitations.length >= 4) return false;

  // If they have high pain in 2+ areas, adaptive
  const highPainCount = Object.values(painAreas).filter(v => v >= 6).length;
  if (highPainCount >= 2) return false;

  return true;
}

export default function StepAbilities({ data, onChange }) {
  const abilities = data.current_abilities || {};
  const markedPainAreas = data.marked_zones || [];
  const athletic = isAthleticTier(data);

  const checklist = athletic
    ? ABILITIES_CHECKLIST_ATHLETIC
    : ABILITIES_CHECKLIST.filter(ability => {
        if (markedPainAreas.length === 0) return true;
        const relatedAreas = ABILITY_PAIN_MAP[ability.key] || [];
        return relatedAreas.some(area => markedPainAreas.includes(area));
      });

  const setAbility = (key, value) => {
    onChange({ current_abilities: { ...abilities, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Current Abilities</h2>
        <p className="text-muted-foreground mt-2">
          {athletic
            ? "Check everything you can currently do"
            : "Check the activities you are able to do"}
        </p>
      </div>

      <div className="space-y-3">
        {checklist.map(({ key, label }) => {
          const val = abilities[key] === true;
          return (
            <button
              key={key}
              onClick={() => setAbility(key, !val)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left font-medium text-sm ${
                val
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}