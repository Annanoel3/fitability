import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";

const CATEGORIES = ["Warmup", "Strength", "Cardio", "Balance", "Flexibility", "Cooldown", "Breathing", "Recovery"];
const POSITIONS = ["Seated", "Standing", "Wheelchair", "Lying down"];
const DIFFICULTIES = ["Beginner", "Easy", "Moderate", "Advanced"];

export default function CreateExerciseModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [tourFilling, setTourFilling] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    instructions: "",
    category: "",
    position: "",
    difficulty: "Easy",
    default_reps: "",
    default_sets: "",
    default_duration_seconds: "",
    muscles_used: ""
  });

  useEffect(() => {
    if (window.fitabilityTourStep !== "create_exercise") return;
    setTourFilling(true);
    const steps = [
      [300,  () => setForm(f => ({ ...f, name: "Seated Marches" }))],
      [700,  () => setForm(f => ({ ...f, default_sets: 3 }))],
      [1100, () => setForm(f => ({ ...f, default_reps: 12 }))],
      [1500, () => setForm(f => ({ ...f, description: "Gentle warm-up, move at your own pace." }))],
      [1800, () => {
        setTourFilling(false);
        onClose();
        window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "create_exercise_filled" }));
      }],
    ];
    const timers = steps.map(([delay, fn]) => setTimeout(fn, delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.position) {
      alert("Please fill in name, category, and position");
      return;
    }
    setLoading(true);
    try {
      await base44.entities.Exercise.create({
        ...form,
        is_custom: true,
        restriction_tags: [],
        suitable_for_tags: [],
        equipment_tags: [],
        muscles_used: form.muscles_used ? form.muscles_used.split(",").map(m => m.trim()) : []
      });
      onSuccess();
    } catch (e) {
      alert("Error creating exercise: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="font-heading font-bold text-lg">Create Exercise</h2>
            {tourFilling && <p className="text-xs text-primary font-medium mt-0.5">Filling this in for you...</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">Exercise name *</label>
            <Input
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="e.g. Wall Sits"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">Description</label>
            <Textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="What does this exercise do?"
              className="mt-1 h-20"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">Instructions</label>
            <Textarea
              value={form.instructions}
              onChange={e => setForm({...form, instructions: e.target.value})}
              placeholder="Step-by-step how to perform this exercise"
              className="mt-1 h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-semibold text-foreground">Category *</label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Position *</label>
              <Select value={form.position} onValueChange={v => setForm({...form, position: v})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">Difficulty</label>
            <Select value={form.difficulty} onValueChange={v => setForm({...form, difficulty: v})}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Sets</label>
              <Input
                type="number"
                value={form.default_sets}
                onChange={e => setForm({...form, default_sets: e.target.value ? parseInt(e.target.value) : ""})}
                placeholder="3"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Reps</label>
              <Input
                type="number"
                value={form.default_reps}
                onChange={e => setForm({...form, default_reps: e.target.value ? parseInt(e.target.value) : ""})}
                placeholder="10"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Seconds</label>
              <Input
                type="number"
                value={form.default_duration_seconds}
                onChange={e => setForm({...form, default_duration_seconds: e.target.value ? parseInt(e.target.value) : ""})}
                placeholder="30"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">Muscles (comma-separated)</label>
            <Input
              value={form.muscles_used}
              onChange={e => setForm({...form, muscles_used: e.target.value})}
              placeholder="e.g. quads, glutes, core"
              className="mt-1"
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}