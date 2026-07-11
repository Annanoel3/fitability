import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Smile, Meh, Frown, AlertCircle, Zap, Battery, BatteryLow, BatteryWarning } from "lucide-react";

const MOODS = [
  { value: "Great", icon: Smile, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200" },
  { value: "Good", icon: Smile, color: "text-lime-500", bg: "bg-lime-50 border-lime-200" },
  { value: "Fair", icon: Meh, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
  { value: "Bad", icon: Frown, color: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
  { value: "Severe pain", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 border-red-200" }
];

const ENERGIES = [
  { value: "High", icon: Zap, label: "High Energy" },
  { value: "Medium", icon: Battery, label: "Medium" },
  { value: "Low", icon: BatteryLow, label: "Low" },
  { value: "Exhausted", icon: BatteryWarning, label: "Exhausted" }
];

export default function CheckInCard({ onCheckInComplete, tourActive, onTourWorkoutClick }) {
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.PainLog.create({
      date: today,
      mood,
      energy,
      overall_pain: mood === "Severe pain" ? 9 : mood === "Bad" ? 7 : mood === "Fair" ? 4 : mood === "Good" ? 2 : 0
    });
    onCheckInComplete({ mood, energy });
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      <div>
        <h3 className="font-heading font-bold text-lg text-foreground">How are you feeling today?</h3>
        <p className="text-sm text-muted-foreground mt-1">Your workout will adapt to how you feel.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-3">Pain & Mood</p>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map(m => {
            const Icon = m.icon;
            const active = mood === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  active ? m.bg : "border-border hover:border-primary/20"
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? m.color : "text-muted-foreground"}`} />
                <span className="text-xs font-medium">{m.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-3">Energy Level</p>
        <div className="grid grid-cols-4 gap-2">
          {ENERGIES.map(e => {
            const Icon = e.icon;
            const active = energy === e.value;
            return (
              <button
                key={e.value}
                onClick={() => setEnergy(e.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  active ? "border-primary bg-secondary" : "border-border hover:border-primary/20"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium">{e.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        data-tour-start-workout={tourActive ? "true" : undefined}
        onClick={tourActive && onTourWorkoutClick ? onTourWorkoutClick : handleSubmit}
        disabled={tourActive ? false : (!mood || !energy || saving)}
        className="w-full h-12"
      >
        {saving ? "Saving..." : "Start Today's Workout"}
      </Button>
    </div>
  );
}