import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Archive, ChevronDown, ChevronUp, Dumbbell, Clock, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ArchivedWorkouts() {
  const navigate = useNavigate();
  const [archived, setArchived] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WorkoutPlan.filter({ archived: true }, "-date", 20)
      .then(setArchived)
      .finally(() => setLoading(false));
  }, []);

  if (loading || archived.length === 0) return null;

  const handleDoAgain = (workout) => {
    // Navigate to workout page with the archived workout's data — let user do it again
    navigate("/workout", { state: { workout } });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-foreground">Archived Workouts</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{archived.length}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {archived.map(w => {
            const dateLabel = w.date
              ? new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "";
            return (
              <div key={w.id} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{w.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{dateLabel}</span>
                      {w.total_duration_minutes && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.total_duration_minutes} min</span>
                        </>
                      )}
                      {w.difficulty_level && <><span>·</span><span>{w.difficulty_level}</span></>}
                      {w.user_rating && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{w.user_rating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 mt-3"
                  onClick={() => handleDoAgain(w)}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Do Again
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}