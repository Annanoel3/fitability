import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Dumbbell, Loader2, Shield } from "lucide-react";

const CATEGORIES = ["All", "Warmup", "Strength", "Cardio", "Balance", "Flexibility", "Cooldown", "Breathing", "Recovery"];
const POSITIONS = ["All", "Seated", "Standing", "Wheelchair", "Lying down"];

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [position, setPosition] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const data = await base44.entities.Exercise.filter({}, "name");
    setExercises(data);
    setLoading(false);

    if (data.length === 0) {
      generateInitialLibrary();
    }
  };

  const generateInitialLibrary = async () => {
    setGenerating(true);
    const profiles = await base44.entities.UserProfile.filter({});
    const profile = profiles[0];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a library of 20 adaptive exercises suitable for people with disabilities and mobility limitations.
      
${profile ? `User profile: Activity level: ${profile.activity_level}, Disabilities: ${(profile.disabilities || []).join(", ")}, Mode: ${profile.fitness_mode}` : "General adaptive exercises"}

Include a mix of:
- Seated exercises
- Standing exercises (if applicable)
- Wheelchair exercises
- Balance exercises
- Flexibility/stretching
- Breathing exercises
- Warmup/cooldown moves

For each exercise provide: name, description, instructions (step by step), category (Warmup/Strength/Cardio/Balance/Flexibility/Cooldown/Breathing/Recovery), position (Seated/Standing/Wheelchair/Lying down/Any), difficulty (Beginner/Easy/Moderate/Advanced), muscles_used (array), equipment_needed (array, can be empty), restrictions (array of conditions where this should NOT be used), modifications, default_sets, default_reps, default_duration_seconds`,
      response_json_schema: {
        type: "object",
        properties: {
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                instructions: { type: "string" },
                category: { type: "string" },
                position: { type: "string" },
                difficulty: { type: "string" },
                muscles_used: { type: "array", items: { type: "string" } },
                equipment_needed: { type: "array", items: { type: "string" } },
                restrictions: { type: "array", items: { type: "string" } },
                modifications: { type: "string" },
                default_sets: { type: "number" },
                default_reps: { type: "number" },
                default_duration_seconds: { type: "number" }
              }
            }
          }
        }
      },
      model: "claude_sonnet_4_6"
    });

    if (result.exercises) {
      await base44.entities.Exercise.bulkCreate(
        result.exercises.map(ex => ({ ...ex, safety_rating: "Safe" }))
      );
      const updated = await base44.entities.Exercise.filter({}, "name");
      setExercises(updated);
    }
    setGenerating(false);
  };

  const filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()) && 
        !ex.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && ex.category !== category) return false;
    if (position !== "All" && ex.position !== position && ex.position !== "Any") return false;
    return true;
  });

  const difficultyColor = {
    "Beginner": "bg-emerald-100 text-emerald-700",
    "Easy": "bg-lime-100 text-lime-700",
    "Moderate": "bg-amber-100 text-amber-700",
    "Advanced": "bg-red-100 text-red-700"
  };

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {generating ? "Building your personalized exercise library..." : "Loading exercises..."}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Exercise Library</h1>
        <p className="text-muted-foreground mt-1">Browse exercises filtered for your safety.</p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="pl-10 h-12"
          />
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {filtered.map(ex => (
          <button
            key={ex.id}
            onClick={() => setSelectedExercise(selectedExercise?.id === ex.id ? null : ex)}
            className="w-full text-left bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{ex.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColor[ex.difficulty] || "bg-muted text-muted-foreground"}`}>
                      {ex.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">{ex.position}</span>
                    <span className="text-xs text-muted-foreground">{ex.category}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedExercise?.id === ex.id && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {ex.description && <p className="text-sm text-muted-foreground">{ex.description}</p>}
                
                {ex.instructions && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase mb-1">Instructions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{ex.instructions}</p>
                  </div>
                )}

                <div className="flex gap-4 text-sm">
                  {ex.default_sets && <span className="text-muted-foreground">Sets: <strong className="text-foreground">{ex.default_sets}</strong></span>}
                  {ex.default_reps && <span className="text-muted-foreground">Reps: <strong className="text-foreground">{ex.default_reps}</strong></span>}
                  {ex.default_duration_seconds && <span className="text-muted-foreground">Duration: <strong className="text-foreground">{ex.default_duration_seconds}s</strong></span>}
                </div>

                {ex.muscles_used && ex.muscles_used.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ex.muscles_used.map(m => (
                      <span key={m} className="px-2 py-0.5 bg-secondary rounded-full text-xs">{m}</span>
                    ))}
                  </div>
                )}

                {ex.modifications && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase mb-1">Modifications</h4>
                    <p className="text-sm text-muted-foreground">{ex.modifications}</p>
                  </div>
                )}

                {ex.restrictions && ex.restrictions.length > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-amber-800">Not recommended for:</span>
                      <p className="text-xs text-amber-700">{ex.restrictions.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No exercises found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}