import React from "react";

const EQUIPMENT_OPTIONS = [
  { id: "none", label: "No equipment", desc: "Bodyweight only — totally fine!" },
  { id: "resistance_bands", label: "Resistance bands", desc: "Light to heavy bands" },
  { id: "dumbbells", label: "Dumbbells", desc: "Free weights" },
  { id: "mat", label: "Exercise mat", desc: "Yoga or gym mat" },
  { id: "cane_walker", label: "Cane / Walker", desc: "For stability support" },
  { id: "wheelchair", label: "Wheelchair", desc: "Seated wheelchair workouts" },
];

export default function StepEquipment({ data, onChange }) {
  const equipment = data.equipment || [];

  const toggle = (id) => {
    if (id === "none") {
      onChange({ equipment: ["none"] });
      return;
    }
    const without_none = equipment.filter(e => e !== "none");
    const next = without_none.includes(id)
      ? without_none.filter(e => e !== id)
      : [...without_none, id];
    onChange({ equipment: next });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">What equipment do you have?</h2>
        <p className="text-muted-foreground mt-2">Select everything available to you. Workouts will be tailored to what you have.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {EQUIPMENT_OPTIONS.map(e => {
          const selected = equipment.includes(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{e.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.desc}</div>
            </button>
          );
        })}
      </div>


    </div>
  );
}