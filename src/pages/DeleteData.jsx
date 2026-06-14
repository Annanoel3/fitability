import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ChevronLeft, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeleteData() {
  const [deleting, setDeleting] = useState({});
  const [deleted, setDeleted] = useState({});

  const deleteCategory = async (category) => {
    setDeleting(p => ({ ...p, [category]: true }));
    
    if (category === "workouts") {
      const items = await base44.entities.WorkoutPlan.filter({});
      for (const item of items) await base44.entities.WorkoutPlan.delete(item.id);
    } else if (category === "pain") {
      const items = await base44.entities.PainLog.filter({});
      for (const item of items) await base44.entities.PainLog.delete(item.id);
    } else if (category === "progress") {
      const items = await base44.entities.ProgressLog.filter({});
      for (const item of items) await base44.entities.ProgressLog.delete(item.id);
    } else if (category === "symptoms") {
      const items = await base44.entities.SymptomLog.filter({});
      for (const item of items) await base44.entities.SymptomLog.delete(item.id);
    } else if (category === "exercises") {
      const items = await base44.entities.Exercise.filter({});
      for (const item of items) await base44.entities.Exercise.delete(item.id);
    }

    setDeleting(p => ({ ...p, [category]: false }));
    setDeleted(p => ({ ...p, [category]: true }));
  };

  const categories = [
    { key: "workouts", label: "Workout History", desc: "All generated workouts and completion data" },
    { key: "pain", label: "Pain Logs", desc: "Daily pain and mood check-ins" },
    { key: "progress", label: "Progress Logs", desc: "Weight, steps, and progress entries" },
    { key: "symptoms", label: "Symptom Logs", desc: "Symptom tracking data" },
    { key: "exercises", label: "Exercise Library", desc: "Generated exercise database" }
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-2">Delete My Data</h1>
      <p className="text-muted-foreground mb-6">Delete specific data while keeping your account. This action cannot be undone.</p>

      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.key} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{cat.label}</div>
              <div className="text-xs text-muted-foreground">{cat.desc}</div>
            </div>
            {deleted[cat.key] ? (
              <span className="text-xs text-emerald-600 font-medium">Deleted ✓</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteCategory(cat.key)}
                disabled={deleting[cat.key]}
                className="text-destructive border-destructive/30"
              >
                {deleting[cat.key] ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}