import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Archive, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StaleWorkoutCard({ workout, onDone }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);

  const handleArchive = async () => {
    setSaving(true);
    setAction("archive");
    await base44.entities.WorkoutPlan.update(workout.id, {
      archived: true,
      ...(rating > 0 ? { user_rating: rating } : {}),
      ...(note.trim() ? { user_feedback: note.trim() } : {}),
    });
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

      <div>
        <p className="text-sm font-medium text-foreground mb-2">How was this workout?</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star className={`w-8 h-8 transition-colors ${s <= (hoverRating || rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        rows={2}
        placeholder="Optional note — what worked, what didn't, how you felt…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

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