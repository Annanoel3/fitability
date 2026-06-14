import React, { useState } from "react";
import { BODY_LIMITATION_GROUPS } from "@/lib/constants";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export default function StepBodyLimitations({ data, onChange }) {
  const [expanded, setExpanded] = useState(null);
  const selected = data.body_limitations || [];

  const toggle = (item) => {
    const next = selected.includes(item)
      ? selected.filter(l => l !== item)
      : [...selected, item];
    onChange({ body_limitations: next });
  };

  const toggleArea = (area) => {
    setExpanded(prev => prev === area ? null : area);
  };

  const countSelected = (group) =>
    group.options.filter(o => selected.includes(o)).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Physical Limitations</h2>
        <p className="text-muted-foreground mt-2">Select a body area to expand and choose specific limitations.</p>
      </div>

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

      <div className="space-y-2">
        {BODY_LIMITATION_GROUPS.map(group => {
          const count = countSelected(group);
          const isOpen = expanded === group.area;

          return (
            <div key={group.area} className="border border-border rounded-xl overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleArea(group.area)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
                  isOpen ? "bg-secondary" : "bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{group.icon}</span>
                  <span className="font-semibold text-sm text-foreground">{group.area}</span>
                  {count > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                }
              </button>

              {/* Sub-options */}
              {isOpen && (
                <div className="grid grid-cols-1 gap-1.5 px-4 py-3 bg-muted/20 border-t border-border">
                  {group.options.map(option => {
                    const active = selected.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggle(option)}
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
                        <span className="text-sm font-medium">{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}