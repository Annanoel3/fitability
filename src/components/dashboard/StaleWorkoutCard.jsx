import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Archive, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StaleWorkoutCard({ workout, onDone }) {
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);

  const handleArchive = async () => {
    setSaving(true);
    setAction("archive");
    await base44.entities.WorkoutPlan.update(workout.id, { archived: true });
    onDone();
  };

  const handleDelete = async () => {
    setSaving(true);
    setAction("delete");
    await base44.entities.WorkoutPlan.delete(workout.id);
    onDone();
  };

  const dateLabel = new Date(workout.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric"
  });

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Previous Workout — {dateLabel}</p>
        <h3 className="font-heading font-bold text-foreground">{workout.title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {workout.total_duration_minutes} min · {workout.difficulty_level}
          {workout.completed ? " · ✓ Completed" : " · Not completed"}
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleArchive} disabled={saving} className="flex-1 gap-2">
          {saving && action === "archive" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
          Archive
        </Button>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={saving}
          className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          {saving && action === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete
        </Button>
      </div>
    </div>
  );
}