import React, { useState } from "react";
import { DISABILITIES_DB } from "@/lib/constants";
import { Check, ChevronDown, ChevronUp, Shield } from "lucide-react";

const CATEGORY_META = {
  "Mobility":        { icon: "🦽", desc: "Wheelchair, amputee, paralysis, joint replacements" },
  "Pain Conditions": { icon: "🩹", desc: "Arthritis, chronic pain, fibromyalgia, back/neck pain" },
  "Neurological":    { icon: "🧠", desc: "Parkinson's, stroke, vertigo, tremors" },
  "Respiratory":     { icon: "🫁", desc: "COPD, asthma, breathing limitations" },
  "Cardiovascular":  { icon: "❤️", desc: "Heart disease, high blood pressure, post-cardiac surgery" },
  "Mental Health":   { icon: "🌿", desc: "PTSD, anxiety, depression, cognitive conditions" },
  "Veterans":        { icon: "🎖️", desc: "Combat injuries, service-connected disabilities" },
  "Other":           { icon: "📋", desc: "Diabetes, osteoporosis, cancer recovery, other conditions" },
};

export default function StepDisabilities({ data, onChange }) {
  const selected = data.disabilities || [];
  const [openCategory, setOpenCategory] = useState(null);

  const toggle = (item) => {
    const next = selected.includes(item)
      ? selected.filter(d => d !== item)
      : [...selected, item];
    onChange({ disabilities: next });
  };

  const toggleCategory = (cat) => {
    setOpenCategory(prev => prev === cat ? null : cat);
  };

  const countInCategory = (cat) =>
    (DISABILITIES_DB[cat] || []).filter(item => selected.includes(item)).length;

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-heading font-bold text-foreground">Conditions & Disabilities</h2>
        <p className="text-muted-foreground mt-2">Tap a category, then select what applies to you.</p>
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

      {/* Category cards */}
      <div className="space-y-3">
        {Object.entries(DISABILITIES_DB).map(([category, items]) => {
          const meta = CATEGORY_META[category] || { icon: "📌", desc: "" };
          const count = countInCategory(category);
          const isOpen = openCategory === category;

          return (
            <div
              key={category}
              className={`rounded-xl border transition-all overflow-hidden ${
                isOpen ? "border-primary/50 shadow-sm" : "border-border"
              }`}
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                  isOpen ? "bg-secondary/60" : "bg-card hover:bg-muted/40"
                }`}
              >
                <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{category}</span>
                    {count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta.desc}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                }
              </button>

              {/* Expanded conditions */}
              {isOpen && (
                <div className="px-4 pb-4 pt-2 bg-card grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(item => {
                    const active = selected.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggle(item)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
                          active
                            ? "border-primary bg-secondary"
                            : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          active ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                        }`}>
                          {active && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-medium">{item}</span>
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
          Nothing to select? That's fine — tap Continue to skip.
        </p>
      )}
    </div>
  );
}