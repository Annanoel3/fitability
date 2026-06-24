import React from "react";
import { ABILITIES_CHECKLIST } from "@/lib/constants";

// Map abilities to relevant pain areas
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

export default function StepAbilities({ data, onChange }) {
  const abilities = data.current_abilities || {};
  const markedPainAreas = data.marked_zones || [];

  // Filter abilities to show only those relevant to marked pain areas
  const relevantAbilities = ABILITIES_CHECKLIST.filter(ability => {
    if (markedPainAreas.length === 0) return true; // Show all if no pain areas marked
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
         <p className="text-muted-foreground mt-2">Click the ones that apply to you</p>
       </div>

      <div className="space-y-3">
         {relevantAbilities.map(({ key, label }) => {
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