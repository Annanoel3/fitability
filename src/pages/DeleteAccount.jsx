import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    // Delete all user data
    const entities = ["UserProfile", "WorkoutPlan", "PainLog", "ProgressLog", "SymptomLog", "Exercise", "CaregiverLink"];
    for (const entity of entities) {
      const items = await base44.entities[entity].filter({});
      for (const item of items) await base44.entities[entity].delete(item.id);
    }
    base44.auth.logout("/login");
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-2">Delete My Account</h1>
      
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mt-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="font-bold text-red-900">This action is permanent</h2>
            <p className="text-sm text-red-700 mt-1">
              Deleting your account will permanently remove all your data including your profile, workout history, 
              pain logs, progress data, and exercise library. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="font-semibold text-red-900 text-sm">What happens after deletion:</h3>
          <ul className="list-disc pl-6 text-sm text-red-700 space-y-1">
            <li>All personal data is permanently deleted</li>
            <li>All workout history and progress is removed</li>
            <li>All AI-generated content is deleted</li>
            <li>Your account cannot be recovered</li>
            <li>This process is immediate</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-red-200">
          <p className="text-sm text-red-700 mb-3">Type <strong>DELETE</strong> to confirm:</p>
          <Input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="mb-3 border-red-300"
          />
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirm !== "DELETE" || deleting}
            className="w-full"
          >
            {deleting ? "Deleting everything..." : "Permanently Delete My Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}