import React from "react";
import { GOALS } from "@/lib/constants";
import { Check } from "lucide-react";

export default function StepGoals({ data, onChange }) {
  const selected = data.goals || [];

  const toggle = (goal) => {
    const next = selected.includes(goal)
      ? selected.filter(g => g !== goal)
      : [...selected, goal];
    onChange({ goals: next });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground">What are your goals?</h2>
        <p className="text-muted-foreground mt-2">Select all that apply. We'll tailor your program to these.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOALS.map(goal => {
          const active = selected.includes(goal);
          return (
            <button
              key={goal}
              onClick={() => toggle(goal)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                active
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                active ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
              }`}>
                {active && <Check className="w-4 h-4" />}
              </div>
              <span className="font-medium">{goal}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}