import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const MOOD_EMOJIS = [
  { label: "😢", value: "Terrible", color: "bg-red-100 border-red-300" },
  { label: "😞", value: "Bad", color: "bg-orange-100 border-orange-300" },
  { label: "😐", value: "Fair", color: "bg-yellow-100 border-yellow-300" },
  { label: "🙂", value: "Good", color: "bg-lime-100 border-lime-300" },
  { label: "😄", value: "Great", color: "bg-emerald-100 border-emerald-300" }
];

const ACTIVITY_OPTIONS = [
  { label: "None", desc: "Didn't complete" },
  { label: "Partial", desc: "Some exercises" },
  { label: "Most", desc: "Most exercises" },
  { label: "All", desc: "Full workout" }
];

const EFFORT_LABELS = ["Very Easy", "Easy", "Moderate", "Hard", "Very Hard"];

export default function ProgressLogForm({ onSave, onCancel, saving }) {
  const [activity, setActivity] = useState(null);
  const [energy, setEnergy] = useState(5);
  const [pain, setPain] = useState(0);
  const [mood, setMood] = useState("Good");
  const [effort, setEffort] = useState(3);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!activity) {
      setError("Please select your activity level");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Create ProgressLog entry
      await base44.entities.ProgressLog.create({
        date: today,
        notes: notes || undefined
      });

      // Create PainLog entry for pain/energy/mood tracking
      await base44.entities.PainLog.create({
        date: today,
        pain_areas: {},
        overall_pain: pain,
        fatigue_level: 10 - energy, // inverse: low energy = high fatigue
        mood: mood,
        notes: notes || undefined
      });

      // Dispatch tour event if needed
      window.dispatchEvent(new Event("fitability-progress-logged"));

      onSave();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div>
        <h3 className="font-heading font-semibold text-lg mb-1">Log Today's Progress</h3>
        <p className="text-xs text-muted-foreground">How did your day go?</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 1. Activity Completed */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">✅ Activity Completed</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTIVITY_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setActivity(opt.label)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                activity === opt.label
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-semibold text-sm">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Energy Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">🔋 Energy Level</Label>
          <span className="text-sm font-semibold text-primary">{energy}/10</span>
        </div>
        <Slider
          value={[energy]}
          onValueChange={(val) => setEnergy(val[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Exhausted</span>
          <span>Full energy</span>
        </div>
      </div>

      {/* 3. Pain Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">🩹 Pain Level</Label>
          <span className="text-sm font-semibold text-primary">{pain}/10</span>
        </div>
        <Slider
          value={[pain]}
          onValueChange={(val) => setPain(val[0])}
          min={0}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>No pain</span>
          <span>Severe pain</span>
        </div>
      </div>

      {/* 4. Mood */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">😊 Mood</Label>
        <div className="flex gap-2 justify-between">
          {MOOD_EMOJIS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                mood === m.value
                  ? `${m.color} border-current`
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="text-2xl">{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Effort Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">💪 Effort Level</Label>
          <span className="text-sm font-semibold text-primary">{EFFORT_LABELS[effort - 1]}</span>
        </div>
        <Slider
          value={[effort]}
          onValueChange={(val) => setEffort(val[0])}
          min={1}
          max={5}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Very easy</span>
          <span>Very hard</span>
        </div>
      </div>

      {/* 6. Notes (Optional) */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did you feel? Any thoughts on today's activity?"
          className="resize-none h-20"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || !activity}
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Progress"
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}