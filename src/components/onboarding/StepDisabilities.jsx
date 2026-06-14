import React, { useState } from "react";
import { BODY_CONDITIONS } from "@/lib/constants";
import { Check, ChevronDown, ChevronUp, Shield } from "lucide-react";

export default function StepDisabilities({ data, onChange }) {
  const selected = data.disabilities || [];
  const [openArea, setOpenArea] = useState(null);

  const toggle = (item) => {
    const next = selected.includes(item)
      ? selected.filter(d => d !== item)
      : [...selected, item];
    onChange({ disabilities: next });
  };

  const countInArea = (area) =>
    area.conditions.filter(c => selected.includes(c)).length;

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-heading font-bold text-foreground">Any pain or conditions?</h2>
        <p className="text-muted-foreground mt-2">Tap a body area, then select what applies. Skip anything that doesn't.</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Used <strong>only</strong> to keep unsafe exercises out of your workouts.
        </p>
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(s => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium flex items-center gap-1.5"
            >
              {s} <span className="opacity-70">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Body area cards */}
      <div className="space-y-2">
        {BODY_CONDITIONS.map(group => {
          const count = countInArea(group);
          const isOpen = openArea === group.area;

          return (
            <div
              key={group.area}
              className={`rounded-xl border overflow-hidden transition-all ${
                isOpen ? "border-primary/50 shadow-sm" : count > 0 ? "border-primary/30" : "border-border"
              }`}
            >
              <button
                onClick={() => setOpenArea(prev => prev === group.area ? null : group.area)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors ${
                  isOpen ? "bg-secondary/60" : "bg-card hover:bg-muted/40"
                }`}
              >
                <span className="text-xl flex-shrink-0">{group.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{group.area}</span>
                    {count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.conditions.slice(0, 3).join(", ")}…
                    </p>
                  )}
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="grid grid-cols-1 gap-1.5 px-4 py-3 bg-muted/20 border-t border-border">
                  {group.conditions.map(condition => {
                    const active = selected.includes(condition);
                    return (
                      <button
                        key={condition}
                        onClick={() => toggle(condition)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? "border-primary bg-secondary"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          active ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                        }`}>
                          {active && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-sm font-medium">{condition}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          Nothing applies? Tap Continue to skip.
        </p>
      )}
    </div>
  );
}