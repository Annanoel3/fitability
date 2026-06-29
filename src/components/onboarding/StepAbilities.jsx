import React, { useState } from "react";
import { Info } from "lucide-react";
import { ABILITIES_CHECKLIST_GRADED, ABILITIES_CHECKLIST_GRADED_SEATED } from "@/lib/constants";

const FITNESS_OPTIONS = ["Just starting out", "Light", "Medium", "Strong", "Athletic"];
const SEVERITY_OPTIONS = ["Not at all", "A little", "Moderately", "Severely"];

const FITNESS_DESCRIPTIONS = {
  "Just starting out": "New to exercise or returning after a long break; everyday activities can feel tiring.",
  "Light": "You manage daily life fine but rarely exercise; light effort is plenty.",
  "Medium": "You exercise sometimes and can handle moderate effort like brisk walks or bodyweight work.",
  "Strong": "You exercise regularly and can handle challenging strength and cardio.",
  "Athletic": "Very fit; you train hard and can handle intense, advanced workouts.",
};

const SEVERE_DISABILITIES = [
  "wheelchair", "paralysis", "amputee", "cannot stand", "bedridden",
  "stroke", "parkinson", "multiple sclerosis", "cerebral palsy"
];

// Determine if a user is non-ambulatory based on MOBILITY signals only (not condition_severity)
export function isNonAmbulatory(data) {
  if (data.activity_level === "Bedridden" || data.activity_level === "Mostly seated" || data.activity_level === "Wheelchair user") return true;
  if (data.fitness_mode === "Wheelchair") return true;
  const disabilities = (data.disabilities || []);
  if (disabilities.some(d => SEVERE_DISABILITIES.some(s => d.toLowerCase().includes(s)))) return true;
  const limitations = (data.body_limitations || []).join(' ').toLowerCase();
  if (limitations.includes('cannot stand') || limitations.includes('wheelchair') || limitations.includes('paralyz')) return true;
  return false;
}

export default function StepAbilities({ data, onChange }) {
  const [showFitnessInfo, setShowFitnessInfo] = useState(false);
  const abilities = data.current_abilities || {};

  const nonAmbulatory = isNonAmbulatory(data);
  const gradedChecklist = nonAmbulatory ? ABILITIES_CHECKLIST_GRADED_SEATED : ABILITIES_CHECKLIST_GRADED;

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
        <p className="text-muted-foreground mt-2">Tell us what you can do — this shapes your workout intensity</p>
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

      {/* Graded capability questions — set chosen by mobility, not severity */}
      <div className="space-y-5">
        <p className="text-sm font-semibold text-foreground">Rate your current ability level:</p>
        {gradedChecklist.map(({ id, question, options }) => (
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
    </div>
  );
}