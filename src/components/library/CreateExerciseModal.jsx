import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Check } from "lucide-react";
import TapIndicator from "@/components/onboarding/TapIndicator";

const CATEGORIES = ["Warmup", "Strength", "Cardio", "Balance", "Flexibility", "Cooldown", "Breathing", "Recovery"];
const POSITIONS = ["Seated", "Standing", "Wheelchair", "Lying down"];
const DIFFICULTIES = ["Beginner", "Easy", "Moderate", "Advanced"];

export default function CreateExerciseModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [tourFilling, setTourFilling] = useState(false);
  const [demoPressing, setDemoPressing] = useState(false);
  const [tapTarget, setTapTarget] = useState(null);
  const bodyRef = useRef(null);

  // Refs for each field the demo "taps" during the tour
  const fieldRefs = {
    name: useRef(null),
    sets: useRef(null),
    reps: useRef(null),
    description: useRef(null),
    category: useRef(null),
    position: useRef(null),
    create: useRef(null),
  };
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

    // Helper: flash tap indicator on a field for 600ms
    const flashTap = (key, at) => setTimeout(() => {
      setTapTarget(key);
      setTimeout(() => setTapTarget(null), 600);
    }, at);

    const steps = [
      [250,  () => setForm(f => ({ ...f, name: "Seated Marches" }))],
      [950,  () => setForm(f => ({ ...f, default_sets: 3 }))],
      [1650, () => setForm(f => ({ ...f, default_reps: 12 }))],
      [2350, () => setForm(f => ({ ...f, description: "Gentle warm-up — march in place at your own pace." }))],
      [3150, () => setForm(f => ({ ...f, category: "Cardio" }))],
      [3850, () => setForm(f => ({ ...f, position: "Seated" }))],
      [4500, () => {
        if (bodyRef.current) {
          bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
        }
        setDemoPressing(true);
      }],
      [5800, () => {
        setTourFilling(false);
        setDemoPressing(false);
        onClose();
        window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "create_exercise_filled" }));
      }],
    ];
    // Tap indicators fire slightly before each field is filled
    const taps = [
      flashTap("name", 200),
      flashTap("sets", 900),
      flashTap("reps", 1600),
      flashTap("description", 2300),
      flashTap("category", 3100),
      flashTap("position", 3800),
      flashTap("create", 4400),
    ];
    const timers = steps.map(([delay, fn]) => setTimeout(fn, delay));
    return () => { timers.forEach(clearTimeout); taps.forEach(clearTimeout); };
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      {tourFilling && <div className="absolute inset-0 z-[60]" aria-hidden="true" />}
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        {tourFilling && (
          <div className="tour-demo-label px-5 pt-4">DEMO</div>
        )}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="font-heading font-bold text-lg">Create Exercise</h2>
            {tourFilling && <p className="text-xs text-primary font-medium mt-0.5">Filling this in for you...</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={bodyRef} className="overflow-y-auto flex-1 px-5 space-y-3">
          <div ref={fieldRefs.name}>
            <label className="text-sm font-semibold text-foreground">Exercise name *</label>
            <Input
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="e.g. Wall Sits"
              className="mt-1"
            />
          </div>

          <div ref={fieldRefs.description}>
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
            <div ref={fieldRefs.category}>
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
            <div ref={fieldRefs.position}>
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
            <div ref={fieldRefs.sets}>
              <label className="text-xs font-semibold text-foreground">Sets</label>
              <Input
                type="number"
                value={form.default_sets}
                onChange={e => setForm({...form, default_sets: e.target.value ? parseInt(e.target.value) : ""})}
                placeholder="3"
                className="mt-1 text-sm"
              />
            </div>
            <div ref={fieldRefs.reps}>
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

        <div ref={fieldRefs.create} className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || demoPressing} className={demoPressing ? "flex-1 bg-green-600 text-white hover:bg-green-600" : "flex-1"}>
            {demoPressing ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </div>

      {/* Tap indicators — rendered above everything during demo */}
      {tourFilling && (
        <>
          <TapIndicator targetRef={fieldRefs.name} active={tapTarget === "name"} />
          <TapIndicator targetRef={fieldRefs.sets} active={tapTarget === "sets"} />
          <TapIndicator targetRef={fieldRefs.reps} active={tapTarget === "reps"} />
          <TapIndicator targetRef={fieldRefs.description} active={tapTarget === "description"} />
          <TapIndicator targetRef={fieldRefs.category} active={tapTarget === "category"} />
          <TapIndicator targetRef={fieldRefs.position} active={tapTarget === "position"} />
          <TapIndicator targetRef={fieldRefs.create} active={tapTarget === "create"} />
        </>
      )}
    </div>
  );
}