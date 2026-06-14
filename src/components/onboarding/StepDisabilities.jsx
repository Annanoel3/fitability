import React, { useState } from "react";
import { DISABILITIES_DB } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Check, Search, Shield } from "lucide-react";

export default function StepDisabilities({ data, onChange }) {
  const [search, setSearch] = useState("");
  const selected = data.disabilities || [];

  const toggle = (item) => {
    const next = selected.includes(item)
      ? selected.filter(d => d !== item)
      : [...selected, item];
    onChange({ disabilities: next });
  };

  const allItems = Object.entries(DISABILITIES_DB).flatMap(([cat, items]) =>
    items.map(item => ({ category: cat, name: item }))
  );

  const filtered = search
    ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item.name);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Conditions & Disabilities</h2>
        <p className="text-muted-foreground mt-2">Select any that apply. This ensures your safety.</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          This information is used <strong>only</strong> to prevent unsafe exercises from appearing in your workouts.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search conditions..."
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

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map(item => {
                const active = selected.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggle(item)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
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
                    <span className="font-medium">{item}</span>
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