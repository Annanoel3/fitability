import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const EQUIPMENT_OPTIONS = [
  { id: "none", label: "No equipment", desc: "Bodyweight only" },
  { id: "chair", label: "Chair", desc: "A sturdy chair or seat" },
  { id: "resistance_bands", label: "Resistance bands", desc: "Light to heavy bands" },
  { id: "dumbbells", label: "Dumbbells", desc: "Free weights" },
  { id: "mat", label: "Exercise mat", desc: "Yoga or gym mat" },
  { id: "wall", label: "Wall space", desc: "For support & balance" },
  { id: "cane_walker", label: "Cane / Walker", desc: "For stability support" },
  { id: "wheelchair", label: "Wheelchair", desc: "Seated wheelchair workouts" },
];

export default function EquipmentEditor({ profile, onUpdate }) {
  const [equipment, setEquipment] = useState(profile?.equipment || []);
  const [saving, setSaving] = useState(false);

  const toggleEquipment = (id) => {
    if (id === "none") {
      setEquipment(["none"]);
      return;
    }
    setEquipment(prev => {
      const without_none = prev.filter(e => e !== "none");
      return without_none.includes(id)
        ? without_none.filter(e => e !== id)
        : [...without_none, id];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.UserProfile.update(profile.id, { equipment });
    onUpdate({ equipment });
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-heading font-semibold text-lg text-foreground">Available Equipment</h2>
      <p className="text-sm text-muted-foreground">What equipment do you have access to? Workouts will be tailored to your available equipment.</p>
      
      <div className="grid grid-cols-2 gap-2">
        {EQUIPMENT_OPTIONS.map(e => {
          const selected = equipment.includes(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggleEquipment(e.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{e.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.desc}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || JSON.stringify(equipment) === JSON.stringify(profile?.equipment || [])}
        className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Equipment"}
      </button>
    </div>
  );
}