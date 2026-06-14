import React from "react";
import { ACTIVITY_LEVELS } from "@/lib/constants";

export default function StepActivityLevel({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground">Your current activity level</h2>
        <p className="text-muted-foreground mt-2">There's no wrong answer. We meet you where you are.</p>
      </div>

      <div className="space-y-3">
        {ACTIVITY_LEVELS.map(level => {
          const active = data.activity_level === level.value;
          return (
            <button
              key={level.value}
              onClick={() => onChange({ activity_level: level.value })}
              className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                active
                  ? "border-primary bg-secondary"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex-shrink-0 ${
                active ? "bg-primary ring-4 ring-primary/20" : "border-2 border-muted-foreground/30"
              }`} />
              <div>
                <div className="font-semibold text-foreground">{level.label}</div>
                <div className="text-sm text-muted-foreground">{level.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}