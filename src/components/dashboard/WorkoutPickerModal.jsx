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

export default function WorkoutPickerModal({ onConfirm, onClose }) {
  const [types, setTypes] = useState([]);
  const [intensity, setIntensity] = useState(null);

  const toggleType = (id) => {
    setTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    onConfirm({ workoutTypes: types, intensity });
  };

  const canConfirm = types.length > 0 && intensity;

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

        <div className="overflow-y-auto flex-1 px-5 pt-1 space-y-5">
          {/* Workout Type */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">What type of workout? (choose one or more)</p>
            <div className="grid grid-cols-2 gap-2">
              {WORKOUT_TYPES.map(t => {
                const Icon = t.icon;
                const selected = types.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleType(t.id)}
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



        </div>

        {/* Sticky footer button */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-border">
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full h-12 text-base"
          >
            Generate My Workout ✨
          </Button>
        </div>
      </div>
    </div>
  );
}