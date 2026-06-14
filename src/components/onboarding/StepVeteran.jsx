import React from "react";
import { Shield } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function StepVeteran({ data, onChange }) {
  const isVet = data.is_veteran;
  const details = data.veteran_details || {};

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Veteran Status</h2>
        <p className="text-muted-foreground mt-2">We have specialized programs for veterans.</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => onChange({ is_veteran: true })}
          className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${
            isVet === true ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Yes, I'm a veteran</div>
        </button>
        <button
          onClick={() => onChange({ is_veteran: false, veteran_details: {} })}
          className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${
            isVet === false ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <div className="w-8 h-8 mx-auto mb-2" />
          <div className="font-semibold">No</div>
        </button>
      </div>

      {isVet && (
        <div className="space-y-4 mt-6 p-5 bg-secondary/50 rounded-xl">
          <p className="text-sm text-muted-foreground">Optional: share any additional details to help us personalize your program.</p>
          
          <div>
            <Label className="text-sm font-medium">Service-connected injuries or conditions</Label>
            <Textarea
              value={details.injuries || ""}
              onChange={e => onChange({ veteran_details: { ...details, injuries: e.target.value } })}
              placeholder="e.g., combat injury to left knee, PTSD, hearing loss..."
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ veteran_details: { ...details, ptsd_considerations: !details.ptsd_considerations } })}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                details.ptsd_considerations ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
              }`}
            >
              {details.ptsd_considerations && <span className="text-xs">✓</span>}
            </button>
            <span className="text-sm font-medium">Include PTSD-aware exercise considerations</span>
          </div>
        </div>
      )}
    </div>
  );
}