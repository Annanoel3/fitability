import React from "react";
import { RISK_FACTORS } from "@/lib/constants";
import { Check, AlertTriangle } from "lucide-react";

export default function StepRiskFactors({ data, onChange }) {
  const selected = data.risk_factors || [];

  const toggle = (item) => {
    const next = selected.includes(item)
      ? selected.filter(r => r !== item)
      : [...selected, item];
    onChange({ risk_factors: next });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Risk Factors</h2>
        <p className="text-muted-foreground mt-2">Select any that apply so we can keep you safe.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          This information is critical for your safety. Certain risk factors will automatically exclude exercises that could be dangerous.
        </p>
      </div>

      <div className="space-y-2">
        {RISK_FACTORS.map(item => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                active
                  ? "border-amber-400 bg-amber-50"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                active ? "bg-amber-500 text-white" : "border border-muted-foreground/30"
              }`}>
                {active && <Check className="w-3 h-3" />}
              </div>
              <span className="font-medium text-sm">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}