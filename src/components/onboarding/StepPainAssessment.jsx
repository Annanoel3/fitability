import React from "react";
import { BODY_AREAS } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";

const painColors = {
  0: "bg-emerald-100 text-emerald-700 border-emerald-200",
  1: "bg-emerald-100 text-emerald-700 border-emerald-200",
  2: "bg-lime-100 text-lime-700 border-lime-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  4: "bg-amber-100 text-amber-700 border-amber-200",
  5: "bg-orange-100 text-orange-700 border-orange-200",
  6: "bg-orange-200 text-orange-800 border-orange-300",
  7: "bg-red-100 text-red-700 border-red-200",
  8: "bg-red-200 text-red-800 border-red-300",
  9: "bg-red-300 text-red-900 border-red-400",
  10: "bg-red-400 text-red-950 border-red-500"
};

export default function StepPainAssessment({ data, onChange }) {
  const painAreas = data.pain_areas || {};

  const setPain = (area, value) => {
    onChange({ pain_areas: { ...painAreas, [area]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Pain Assessment</h2>
        <p className="text-muted-foreground mt-2">Rate your current pain level for each area (0 = none, 10 = severe).</p>
      </div>

      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
        {BODY_AREAS.map(area => {
          const level = painAreas[area] || 0;
          return (
            <div key={area} className={`p-4 rounded-xl border ${painColors[level]}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{area}</span>
                <span className="font-bold text-lg">{level}</span>
              </div>
              <Slider
                value={[level]}
                onValueChange={([v]) => setPain(area, v)}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs opacity-60">None</span>
                <span className="text-xs opacity-60">Severe</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}