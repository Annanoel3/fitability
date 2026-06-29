import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { buildUserTags, difficultyAllowed } from "@/lib/userTags";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Dumbbell, Loader2, Shield, Plus, Trash2, BookOpen } from "lucide-react";
import CreateExerciseModal from "@/components/library/CreateExerciseModal";

const CATEGORIES = ["All", "Warmup", "Strength", "Cardio", "Balance", "Flexibility", "Cooldown", "Breathing", "Recovery"];
const POSITIONS = ["All", "Seated", "Standing", "Wheelchair", "Lying down"];
const FILTERS = ["All", "Created by me", "Library"];
const SORT_OPTIONS = ["Name", "Difficulty", "Category"];
const MUSCLE_GROUPS = ["All", "Chest", "Back", "Shoulders", "Arms", "Forearms", "Wrists", "Core", "Abs", "Obliques", "Glutes", "Quads", "Hamstrings", "Calves", "Legs", "Full body"];

const RESTRICTION_LABELS = {
  cannot_stand: "Cannot stand",
  wheelchair_user: "Wheelchair users",
  no_high_impact: "No high-impact activity",
  very_low_mobility: "Very low mobility",
  paraplegia: "Paralysis / paraplegia",
  no_legs: "Lower limb amputation",
  single_leg_amputation: "Single leg amputation",
  no_arms: "Upper limb amputation",
  single_arm_amputation: "Single arm amputation",
  no_bilateral_arms: "Limited bilateral arm use",
  knee_pain: "Knee pain",
  knee_replacement: "Knee replacement",
  hip_pain: "Hip pain",
  hip_replacement: "Hip replacement",
  back_pain: "Back pain",
  no_spinal_flexion: "Spinal flexion restrictions",
  neck_injury: "Neck injury",
  no_neck_flexion: "Neck flexion restrictions",
  shoulder_injury: "Shoulder injury",
  no_overhead_press: "No overhead pressing",
  wrist_injury: "Wrist injury",
  elbow_injury: "Elbow injury",
  ankle_pain: "Ankle pain",
  balance_issues: "Balance difficulties",
  scoliosis: "Scoliosis",
  osteoporosis: "Osteoporosis",
  fracture_risk: "Fracture risk",
  heart_condition: "Heart condition",
  breathing_difficulty: "Breathing difficulties",
  copd: "COPD / lung condition",
  seizure_risk: "Seizure risk",
  no_head_inversion: "No head inversion",
  vertigo: "Vertigo",
  pregnancy: "Pregnancy",
  parkinsons: "Parkinson's disease",
  multiple_sclerosis: "Multiple sclerosis",
  heat_sensitive: "Heat sensitivity",
  fibromyalgia: "Fibromyalgia",
  chronic_fatigue: "Chronic fatigue",
  arthritis: "Arthritis",
  rheumatoid_arthritis: "Rheumatoid arthritis",
  cerebral_palsy: "Cerebral palsy",
  high_bmi: "High BMI",
  immune_compromised: "Immune compromised",
};

// Must match buildUserTags() in Dashboard — same vocabulary


export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [position, setPosition] = useState("All");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Name");
  const [muscleGroup, setMuscleGroup] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleted, setDeleted] = useState(new Set());
  const [tourStep, setTourStep] = useState(() => window.fitabilityTourStep || null);
  const firstExerciseRef = React.useRef(null);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const step = e.detail.tourStep;
      setTourStep(step);
      if (step === "create_exercise") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("fitability-tour-step-change", handler);
    return () => window.removeEventListener("fitability-tour-step-change", handler);
  }, []);



  const loadExercises = async () => {
    setLoading(true);
    const profiles = await base44.entities.UserProfile.filter({});
    const profile = profiles[0];
    if (!profile) { setLoading(false); return; }

    const userEquipment = new Set([
      'chair', 'wall',
      ...(profile.equipment || []).map(e => e.toLowerCase().replace(/\s+/g, '_'))
    ]);
    const userRestrictionTags = buildUserTags(profile).restriction;

    // Load deleted exercises for this user
    const deletedRecs = await base44.entities.DeletedExercise.filter({});
    const deletedSet = new Set(deletedRecs.map(d => d.exercise_id));
    setDeleted(deletedSet);

    // Pull from database and filter by tags — no LLM needed
    const allExercises = await base44.entities.Exercise.list('-created_date', 500);
    const safe = allExercises.filter(ex => {
      // Skip deleted exercises
      if (deletedSet.has(ex.id)) return false;
      // Must not have any tag that matches user's restriction tags (for library exercises only)
      if (!ex.is_custom) {
        const hasRestricted = (ex.restriction_tags || []).some(tag => userRestrictionTags.has(tag));
        if (hasRestricted) return false;
        if (!difficultyAllowed(ex.difficulty, userRestrictionTags)) return false;
        // Must not require equipment the user doesn't have
        const requiredEquip = (ex.equipment_tags || []);
        if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.has(eq))) return false;
        // Exclude exercises that are ONLY suitable for conditions the user doesn't have (e.g., wheelchair_user when user is not)
        const suitableTags = (ex.suitable_for_tags || []);
        const mobilitySpecificTags = new Set(['wheelchair_user', 'very_low_mobility', 'low_mobility', 'seated_only']);
        const hasMobilityTag = suitableTags.some(tag => mobilitySpecificTags.has(tag));
        if (hasMobilityTag && userRestrictionTags.has('wheelchair_user') === false && userRestrictionTags.has('very_low_mobility') === false && userRestrictionTags.has('cannot_stand') === false) {
          return false;
        }
      }
      return true;
    });

    setExercises(safe);
    setLoading(false);
  };

  const filtered = exercises.filter(ex => {
    if (search && !ex.name?.toLowerCase().includes(search.toLowerCase()) &&
        !ex.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && ex.category !== category) return false;
    if (position !== "All" && ex.position !== position && ex.position !== "Any") return false;
    if (filter === "Created by me" && !ex.is_custom) return false;
    if (filter === "Library" && ex.is_custom) return false;
    if (muscleGroup !== "All" && !(ex.muscles_used || []).some(m => m.toLowerCase() === muscleGroup.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Name") return a.name.localeCompare(b.name);
    if (sortBy === "Difficulty") {
      const order = ["Beginner", "Easy", "Moderate", "Advanced"];
      return order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
    }
    if (sortBy === "Category") return a.category.localeCompare(b.category);
    return 0;
  });

  const difficultyColor = {
    "Beginner": "bg-emerald-100 text-emerald-700",
    "Easy": "bg-lime-100 text-lime-700",
    "Moderate": "bg-amber-100 text-amber-700",
    "Advanced": "bg-red-100 text-red-700"
  };

  const handleDelete = async (ex) => {
    if (!confirm(`Delete "${ex.name}" from your library? It won't appear in future workouts.`)) return;
    try {
      if (ex.is_custom) {
        // User-created exercise: hard delete from the database (they own it)
        await base44.entities.Exercise.delete(ex.id);
        setExercises(prev => prev.filter(e => e.id !== ex.id));
      } else {
        // Shared library exercise: only hide it for this user via the blocklist
        await base44.entities.DeletedExercise.create({
          exercise_id: ex.id,
          exercise_name: ex.name
        });
        setDeleted(new Set([...deleted, ex.id]));
        setExercises(prev => prev.filter(e => e.id !== ex.id));
      }
      setSelectedExercise(null);
    } catch (e) {
      alert("Error deleting exercise: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your exercise library…</p>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      {showCreateModal && (
        <CreateExerciseModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadExercises(); }}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Exercise Library</h1>
          <p className="text-muted-foreground mt-1">
            {sorted.length} exercises available.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
          data-tour-create-exercise={tourStep === "create_exercise" && !showCreateModal ? "true" : undefined}
        >
          <Plus className="w-4 h-4" /> Create Exercise
        </Button>
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
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Filters</div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Category</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Position</div>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Filter</div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Muscle Group</div>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Sort By</div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {sorted.map((ex, i) => (
          <button
            key={ex.id || i}
            ref={i === 0 ? firstExerciseRef : null}
            onClick={() => {
              setSelectedExercise(selectedExercise?.id !== ex.id ? ex : null);
              if (i === 0 && window.fitabilityTourStep === "library_exercise") {
                // Immediately hide the popup, let user read for 3s, then advance
                window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "first_exercise_clicked" }));
                setTimeout(() => {
                  if (firstExerciseRef.current) {
                    firstExerciseRef.current.style.scrollMarginTop = "100px";
                    firstExerciseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 100);
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "exercise_read_done" }));
                }, 3000);
              }
            }}
            data-tour-first-exercise={i === 0 && window.fitabilityTourStep === "library_exercise" ? "true" : undefined}
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

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ex); }}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> {ex.is_custom ? "Delete exercise" : "Hide from my library"}
                </button>

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

                {ex.restriction_tags && ex.restriction_tags.length > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-amber-800">Not recommended for:</span>
                      <p className="text-xs text-amber-700">
                        {ex.restriction_tags.map(tag => RESTRICTION_LABELS[tag] || tag.replace(/_/g, " ")).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </button>
        ))}

        {sorted.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{exercises.length === 0 ? "No exercises in the library yet. Check back soon!" : "No exercises match your filters."}</p>
          </div>
        )}
      </div>
    </div>
  );
}