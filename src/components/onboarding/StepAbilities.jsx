import React from "react";
import { ABILITIES_CHECKLIST } from "@/lib/constants";
import { Check, X } from "lucide-react";

export default function StepAbilities({ data, onChange }) {
  const abilities = data.current_abilities || {};

  const setAbility = (key, value) => {
    onChange({ current_abilities: { ...abilities, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Current Abilities</h2>
        <p className="text-muted-foreground mt-2">Can you do the following? Be honest — no judgment here.</p>
      </div>

      <div className="space-y-3">
        {ABILITIES_CHECKLIST.map(({ key, label }) => {
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