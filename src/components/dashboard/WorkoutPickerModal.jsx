import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Dumbbell, Heart, Wind, Zap, Layers } from "lucide-react";

const WORKOUT_TYPES = [
  { id: "strength", label: "Strength", icon: Dumbbell, desc: "Build muscle & power" },
  { id: "cardio", label: "Cardio", icon: Heart, desc: "Heart health & endurance" },
  { id: "flexibility", label: "Flexibility", icon: Wind, desc: "Stretch & mobility" },
  { id: "balance", label: "Balance", icon: Layers, desc: "Stability & coordination" },
  { id: "mixed", label: "Mixed / Surprise me", icon: Zap, desc: "A bit of everything" },
];

const INTENSITIES = [
  { id: "gentle", label: "Gentle", desc: "Very light, restorative" },
  { id: "easy", label: "Easy", desc: "Low effort, comfortable" },
  { id: "moderate", label: "Moderate", desc: "Somewhat challenging" },
  { id: "challenging", label: "Challenging", desc: "Push my limits safely" },
];

const EQUIPMENT_OPTIONS = [
  { id: "none", label: "No equipment", desc: "Bodyweight only — totally fine!" },
  { id: "chair", label: "Chair", desc: "A sturdy chair or seat" },
  { id: "resistance_bands", label: "Resistance bands", desc: "Light to heavy bands" },
  { id: "dumbbells", label: "Dumbbells", desc: "Free weights" },
  { id: "mat", label: "Exercise mat", desc: "Yoga or gym mat" },
  { id: "wall", label: "Wall space", desc: "For support & balance" },
  { id: "cane_walker", label: "Cane / Walker", desc: "For stability support" },
  { id: "wheelchair", label: "Wheelchair", desc: "Seated wheelchair workouts" },
];

export default function WorkoutPickerModal({ onConfirm, onClose }) {
  const [type, setType] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [equipment, setEquipment] = useState([]);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="font-heading font-bold text-lg">Choose Your Workout</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">
          {/* Workout Type */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">What type of workout?</p>
            <div className="grid grid-cols-2 gap-2">
              {WORKOUT_TYPES.map(t => {
                const Icon = t.icon;
                const selected = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    } ${t.id === "mixed" ? "col-span-2" : ""}`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? "text-primary" : ""}`} />
                    <div>
                      <div className={`text-sm font-semibold ${selected ? "text-foreground" : ""}`}>{t.label}</div>
                      <div className="text-xs opacity-70">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">How intense?</p>
            <div className="grid grid-cols-2 gap-2">
              {INTENSITIES.map(i => {
                const selected = intensity === i.id;
                return (
                  <button
                    key={i.id}
                    onClick={() => setIntensity(i.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{i.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{i.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">What equipment do you have?</p>
            <p className="text-xs text-muted-foreground mb-2">No equipment? That's completely fine — zero judgment here. 🙌</p>
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
          </div>

          <Button
            onClick={() => onConfirm({ workoutType: type, intensity, equipment })}
            disabled={!type || !intensity || equipment.length === 0}
            className="w-full h-12 text-base"
          >
            Generate My Workout ✨
          </Button>
        </div>
      </div>
    </div>
  );
}