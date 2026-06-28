import React from "react";
import { ABILITIES_CHECKLIST, ABILITIES_CHECKLIST_ATHLETIC, ABILITIES_CHECKLIST_LOW } from "@/lib/constants";

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

const FITNESS_OPTIONS = ["Just starting out", "Light", "Medium", "Strong", "Athletic"];
const SEVERITY_OPTIONS = ["Not at all", "A little", "Moderately", "Severely"];

const SEVERE_DISABILITIES = [
  "wheelchair", "paralysis", "amputee", "cannot stand", "bedridden",
  "stroke", "parkinson", "multiple sclerosis", "cerebral palsy"
];

function isLowCapabilityTier(data) {
  if (data.condition_severity === "Severely") return true;
  if (data.activity_level === "Bedridden" || data.activity_level === "Mostly seated") return true;
  const disabilities = (data.disabilities || []);
  return disabilities.some(d => SEVERE_DISABILITIES.some(s => d.toLowerCase().includes(s)));
}

export default function StepAbilities({ data, onChange }) {
  const abilities = data.current_abilities || {};
  const lowCap = isLowCapabilityTier(data);
  const athletic = !lowCap && isAthleticTier(data);
  const checklist = lowCap ? ABILITIES_CHECKLIST_LOW : athletic ? ABILITIES_CHECKLIST_ATHLETIC : ABILITIES_CHECKLIST;

  const hasConditions =
    (data.disabilities || []).length > 0 ||
    (data.body_limitations || []).length > 0 ||
    Object.keys(data.pain_areas || {}).length > 0 ||
    (data.marked_zones || []).length > 0;

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

      {/* Q1: Self-reported fitness level */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">How would you describe your fitness right now?</p>
        <div className="space-y-2">
          {FITNESS_OPTIONS.map(option => (
            <button
              key={option}
              onClick={() => onChange({ self_reported_fitness: option })}
              className={`w-full p-3.5 rounded-xl border-2 transition-all text-left font-medium text-sm ${
                data.self_reported_fitness === option
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Q2: Condition severity — only if user has conditions/pain */}
      {hasConditions && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">How much do your conditions or pain limit your daily activities?</p>
          <div className="space-y-2">
            {SEVERITY_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => onChange({ condition_severity: option })}
                className={`w-full p-3.5 rounded-xl border-2 transition-all text-left font-medium text-sm ${
                  data.condition_severity === option
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abilities checklist */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          {athletic ? "Check everything you can currently do:" : "Check the activities you are able to do:"}
        </p>
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