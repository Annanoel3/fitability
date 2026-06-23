import React from "react";
import { ABILITIES_CHECKLIST } from "@/lib/constants";
import { Check, X } from "lucide-react";

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
        <p className="text-muted-foreground mt-2">Can you do the following?</p>
      </div>

      <div className="space-y-3">
         {relevantAbilities.map(({ key, label }) => {
          const val = abilities[key];
          return (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <span className="font-medium text-sm flex-1 mr-4">{label}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setAbility(key, true)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    val === true
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-border hover:border-emerald-300"
                  }`}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setAbility(key, false)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    val === false
                      ? "bg-red-500 text-white"
                      : "border-2 border-border hover:border-red-300"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}