import React, { useState } from "react";
import { BODY_LIMITATIONS } from "@/lib/constants";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function StepBodyLimitations({ data, onChange }) {
  const [search, setSearch] = useState("");
  const selected = data.body_limitations || [];

  const toggle = (item) => {
    const next = selected.includes(item)
      ? selected.filter(l => l !== item)
      : [...selected, item];
    onChange({ body_limitations: next });
  };

  const filtered = search
    ? BODY_LIMITATIONS.filter(l => l.toLowerCase().includes(search.toLowerCase()))
    : BODY_LIMITATIONS;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Body Limitations</h2>
        <p className="text-muted-foreground mt-2">Tell us what movements are difficult or impossible for you.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search limitations..."
          className="pl-10 h-12 text-lg"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(s => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium flex items-center gap-1.5"
            >
              {s} <span className="text-primary-foreground/70">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
        {filtered.map(item => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
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
              <span className="font-medium text-sm">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}