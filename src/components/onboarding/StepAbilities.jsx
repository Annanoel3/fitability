import React, { useState } from "react";
import { Info } from "lucide-react";
import { ABILITIES_CHECKLIST, ABILITIES_CHECKLIST_ATHLETIC, ABILITIES_CHECKLIST_LOW, ABILITIES_CHECKLIST_GRADED } from "@/lib/constants";

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

  // If they have significant physical conditions, use adaptive questions
  const severeLimitations = [
    "wheelchair", "paralysis", "amputee", "cannot stand", "bedridden",
    "stroke", "parkinson", "multiple sclerosis", "cerebral palsy"
  ];
  const hasSevereCondition = disabilities.some(d =>
    severeLimitations.some(s => d.toLowerCase().includes(s))
  );
  if (hasSevereCondition) return false;

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

const FITNESS_DESCRIPTIONS = {
  "Just starting out": "New to exercise or returning after a long break; everyday activities can feel tiring.",
  "Light": "You manage daily life fine but rarely exercise; light effort is plenty.",
  "Medium": "You exercise sometimes and can handle moderate effort like brisk walks or bodyweight work.",
  "Strong": "You exercise regularly and can handle challenging strength and cardio.",
  "Athletic": "Very fit; you train hard and can handle intense, advanced workouts.",
};

export default function StepAbilities({ data, onChange }) {
  const [showFitnessInfo, setShowFitnessInfo] = useState(false);
  const abilities = data.current_abilities || {};
  const lowCap = isLowCapabilityTier(data);
  const athletic = !lowCap && (["Strong", "Athletic"].includes(data.self_reported_fitness) || isAthleticTier(data));
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
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">How would you describe your fitness right now?</p>
          <button
            type="button"
            onClick={() => setShowFitnessInfo(v => !v)}
            className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex-shrink-0"
            aria-label="Fitness level descriptions"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
        {showFitnessInfo && (
          <div className="bg-muted/60 border border-border rounded-xl p-3 space-y-1.5">
            {FITNESS_OPTIONS.map(opt => (
              <p key={opt} className="text-xs text-foreground leading-snug">
                <span className="font-semibold">{opt}:</span> {FITNESS_DESCRIPTIONS[opt]}
              </p>
            ))}
          </div>
        )}
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
          <p className="text-sm font-semibold text-foreground">How much do your conditions or pain affect your daily activities?</p>
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
      {athletic ? (
        <div className="space-y-5">
          <p className="text-sm font-semibold text-foreground">Rate your current fitness level:</p>
          {ABILITIES_CHECKLIST_GRADED.map(({ id, question, options }) => (
            <div key={id} className="space-y-2">
              <p className="text-sm font-medium text-foreground">{question}</p>
              <div className="grid grid-cols-2 gap-2">
                {options.map(opt => {
                  const selected = abilities[id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAbility(id, opt)}
                      className={`p-3 rounded-xl border-2 transition-all text-center font-medium text-sm ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Check the activities you are able to do:</p>
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
      )}
    </div>
  );
}