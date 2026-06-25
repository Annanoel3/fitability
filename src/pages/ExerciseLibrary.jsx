import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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

// Must match buildUserTags() in Dashboard — same vocabulary
function buildUserRestrictionTags(profile) {
  const restriction = new Set();
  const p = profile;
  const limitations = (p.body_limitations || []).join(' ').toLowerCase();
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  const allText = limitations + ' ' + disabilities;

  if (p.fitness_mode === 'Wheelchair' || p.current_abilities?.can_stand === false) {
    restriction.add('cannot_stand'); restriction.add('wheelchair_user');
  }
  if (p.current_abilities?.can_walk === false) restriction.add('cannot_stand');
  if (p.activity_level === 'Bedridden') {
    restriction.add('cannot_stand'); restriction.add('no_high_impact'); restriction.add('very_low_mobility');
  }
  if (allText.includes('paralyz') || allText.includes('paraplegia') || allText.includes('quadriplegia')) {
    restriction.add('cannot_stand'); restriction.add('paraplegia');
  }

  const leftLeg = limitations.includes('left leg') || limitations.includes('left lower');
  const rightLeg = limitations.includes('right leg') || limitations.includes('right lower');
  const bothLegs = limitations.includes('no leg') || limitations.includes('bilateral leg') || limitations.includes('double amputat') || (leftLeg && rightLeg);
  const leftArm = limitations.includes('left arm') || limitations.includes('left upper') || limitations.includes('lost left');
  const rightArm = limitations.includes('right arm') || limitations.includes('right upper') || limitations.includes('lost right');
  const bothArms = limitations.includes('no arm') || limitations.includes('bilateral arm') || (leftArm && rightArm);

  if (bothLegs) { restriction.add('no_legs'); restriction.add('cannot_stand'); restriction.add('no_high_impact'); }
  else if (leftLeg || rightLeg) { restriction.add('single_leg_amputation'); restriction.add('no_high_impact'); }
  if (bothArms) { restriction.add('no_arms'); }
  else if (leftArm || rightArm) { restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms'); }

  Object.entries(p.pain_areas || {}).forEach(([area, level]) => {
    const a = area.toLowerCase();
    if (level >= 4) {
      if (a.includes('knee')) restriction.add('knee_pain');
      if (a.includes('hip')) restriction.add('hip_pain');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('back_pain');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('neck_injury');
      if (a.includes('shoulder')) restriction.add('shoulder_injury');
      if (a.includes('wrist') || a.includes('hand')) restriction.add('wrist_injury');
      if (a.includes('elbow')) restriction.add('elbow_injury');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('ankle_pain');
    }
    if (level >= 7) {
      if (a.includes('knee')) restriction.add('knee_replacement');
      if (a.includes('hip')) restriction.add('hip_replacement');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('no_spinal_flexion');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('no_neck_flexion');
      if (a.includes('shoulder')) restriction.add('no_overhead_press');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('no_high_impact');
    }
  });

  if (limitations.includes('knee')) { restriction.add('knee_pain'); if (limitations.includes('replacement') || limitations.includes('severe') || limitations.includes('surgery')) restriction.add('knee_replacement'); }
  if (limitations.includes('hip')) { restriction.add('hip_pain'); if (limitations.includes('replacement') || limitations.includes('severe')) restriction.add('hip_replacement'); }
  if (limitations.includes('back') || limitations.includes('lumbar') || limitations.includes('spine')) restriction.add('back_pain');
  if (limitations.includes('herniat') || limitations.includes('disc')) { restriction.add('back_pain'); restriction.add('no_spinal_flexion'); }
  if (limitations.includes('neck') || limitations.includes('cervical')) restriction.add('neck_injury');
  if (limitations.includes('shoulder') || limitations.includes('rotator')) restriction.add('shoulder_injury');
  if (limitations.includes('wrist') || limitations.includes('carpal')) restriction.add('wrist_injury');
  if (limitations.includes('ankle')) restriction.add('ankle_pain');
  if (limitations.includes('balance')) restriction.add('balance_issues');
  if (limitations.includes('scoliosis')) { restriction.add('scoliosis'); if (limitations.includes('severe')) restriction.add('no_spinal_flexion'); }
  if (limitations.includes('osteoporosis')) { restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact'); }

  if (disabilities.includes('heart') || disabilities.includes('cardiac') || disabilities.includes('cardiovascular')) {
    restriction.add('heart_condition'); restriction.add('no_high_impact'); restriction.add('breathing_difficulty');
  }
  if (disabilities.includes('copd') || disabilities.includes('emphysema') || disabilities.includes('pulmonary')) {
    restriction.add('copd'); restriction.add('breathing_difficulty');
  }
  if (disabilities.includes('epilepsy') || disabilities.includes('seizure')) { restriction.add('seizure_risk'); restriction.add('no_head_inversion'); }
  if (allText.includes('osteoporosis')) { restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact'); }
  if (allText.includes('fracture') || allText.includes('brittle bone')) { restriction.add('fracture_risk'); restriction.add('no_high_impact'); }
  if (disabilities.includes('vertigo') || disabilities.includes('vestibular')) { restriction.add('vertigo'); restriction.add('balance_issues'); restriction.add('no_head_inversion'); }
  if (disabilities.includes('pregnancy')) { restriction.add('pregnancy'); restriction.add('no_spinal_flexion'); }
  if (disabilities.includes('parkinson')) { restriction.add('parkinsons'); restriction.add('no_high_impact'); }
  if (disabilities.includes('multiple sclerosis') || disabilities.includes(' ms ') || disabilities.includes('ms,')) { restriction.add('multiple_sclerosis'); restriction.add('heat_sensitive'); }
  if (disabilities.includes('fibromyalgia') || disabilities.includes('chronic fatigue') || disabilities.includes('cfs')) { restriction.add('fibromyalgia'); restriction.add('chronic_fatigue'); }
  if (disabilities.includes('arthritis') || disabilities.includes('rheumatoid')) { restriction.add('arthritis'); restriction.add('no_high_impact'); }
  if (disabilities.includes('rheumatoid')) restriction.add('rheumatoid_arthritis');
  if (disabilities.includes('cerebral palsy')) restriction.add('cerebral_palsy');

  const bmi = (p.weight_lbs && p.height_inches) ? (p.weight_lbs / (p.height_inches * p.height_inches)) * 703 : null;
  if (bmi && bmi >= 35) { restriction.add('no_high_impact'); restriction.add('high_bmi'); }
  else if (bmi && bmi >= 30) restriction.add('no_high_impact');

  if (p.activity_level === 'Bedridden' || p.activity_level === 'Mostly seated') {
    restriction.add('no_high_impact'); restriction.add('very_low_mobility');
  }

  (p.risk_factors || []).forEach(r => {
    const rf = r.toLowerCase();
    if (rf.includes('fall')) restriction.add('balance_issues');
    if (rf.includes('surgery') && (rf.includes('recent') || rf.includes('post'))) restriction.add('fracture_risk');
    if (rf.includes('pacemaker') || rf.includes('defibrillator')) { restriction.add('heart_condition'); restriction.add('breathing_difficulty'); }
    if (rf.includes('blood pressure') || rf.includes('hypertension')) restriction.add('breathing_difficulty');
    if (rf.includes('immune') || rf.includes('immunocompromised')) restriction.add('immune_compromised');
  });

  return restriction;
}

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
  const [tourStep, setTourStep] = useState(null);
  const isTourLibrarySort = tourStep === "library_sort";

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    const handleTourChange = (e) => {
      setTourStep(e.detail.tourStep);
      if (e.detail.tourStep === "library_sort") {
        setSortBy("Name"); // Reset to default so they can click any button
      }
    };
    window.addEventListener("fitability-tour-step-change", handleTourChange);
    if (window.fitabilityTourStep) {
      setTourStep(window.fitabilityTourStep);
    }
    return () => window.removeEventListener("fitability-tour-step-change", handleTourChange);
  }, []);

  // Auto-advance tour when landing on library (if still on library step)
  useEffect(() => {
    if (tourStep === "library") {
      setTimeout(() => {
        setTourStep("library_sort");
        window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "library_sort" } }));
      }, 500);
    }
  }, [tourStep]);

  const loadExercises = async () => {
    setLoading(true);
    const profiles = await base44.entities.UserProfile.filter({});
    const profile = profiles[0];
    if (!profile) { setLoading(false); return; }

    const userEquipment = new Set([
      'chair', 'wall',
      ...(profile.equipment || []).map(e => e.toLowerCase().replace(/\s+/g, '_'))
    ]);
    const userRestrictionTags = buildUserRestrictionTags(profile);

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
        // Must not require equipment the user doesn't have
        const requiredEquip = (ex.equipment_tags || []);
        if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.has(eq))) return false;
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
      await base44.entities.DeletedExercise.create({
        exercise_id: ex.id,
        exercise_name: ex.name
      });
      setDeleted(new Set([...deleted, ex.id]));
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
      {isTourLibrarySort && (
        <style>{`
          @keyframes button-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          [data-tour-sort-button] {
            animation: button-pulse 1.5s ease-in-out infinite;
          }
        `}</style>
      )}
      {isTourLibrarySort && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
          <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-foreground">Filter your exercises</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Tap one of the sorting buttons above to filter exercises by difficulty, category, or position.
              </p>
            </div>
          </div>
        </div>
      )}
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
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
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
              <Select value={sortBy} onValueChange={(val) => {
                setSortBy(val);
                if (isTourLibrarySort) {
                  setTimeout(() => {
                    setTourStep("progress");
                    window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "progress" } }));
                  }, 500);
                }
              }}>
                <SelectTrigger data-tour-sort-button={isTourLibrarySort ? "true" : undefined}>
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

                {ex.is_custom && (
                  <button
                    onClick={() => handleDelete(ex)}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete from library
                  </button>
                )}

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
                      <p className="text-xs text-amber-700">{ex.restriction_tags.join(", ")}</p>
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