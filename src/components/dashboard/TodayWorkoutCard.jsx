import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Dumbbell, Clock, Target, ChevronRight, Archive, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TodayWorkoutCard({ workout, onArchived, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);

  const handleArchive = async () => {
    setSaving(true);
    setAction("archive");
    try {
      await base44.entities.WorkoutPlan.update(workout.id, { archived: true });
      onArchived?.();
    } catch (e) {
      setSaving(false);
      setAction(null);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setAction("delete");
    try {
      await base44.entities.WorkoutPlan.delete(workout.id);
      onDeleted?.();
    } catch (e) {
      setSaving(false);
      setAction(null);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors">
      <Link to="/workout" state={{ workout }} className="block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground">{workout.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {workout.total_duration_minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {workout.difficulty_level}
                </span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
        {workout.completed && (
          <div className="mt-3 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium text-center">
            ✓ Completed — tap to restart
          </div>
        )}
      </Link>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleArchive} disabled={saving} size="sm" variant="outline" className="flex-1 gap-1.5">
          {saving && action === "archive" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
          Archive
        </Button>
        <Button
          onClick={handleDelete}
          disabled={saving}
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          {saving && action === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </Button>
      </div>
    </div>
  );
}