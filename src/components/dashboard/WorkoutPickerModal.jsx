import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Dumbbell, Heart, Wind, Zap, Layers, Check } from "lucide-react";

const WORKOUT_TYPES = [
  { id: "strength", label: "Strength", icon: Dumbbell, desc: "Build muscle & power" },
  { id: "cardio", label: "Cardio", icon: Heart, desc: "Heart health & endurance" },
  { id: "flexibility", label: "Flexibility", icon: Wind, desc: "Stretch & mobility" },
  { id: "balance", label: "Balance", icon: Layers, desc: "Stability & coordination" },
  { id: "mixed", label: "Mixed / Surprise me", icon: Zap, desc: "A bit of everything" },
];

const INTENSITIES = [
  { id: "gentle", label: "Gentle", desc: "Very light, restorative" },
  { id: "easy", label: "Easy", desc: "Low effort, comfortable" },
  { id: "moderate", label: "Moderate", desc: "Somewhat challenging" },
  { id: "challenging", label: "Challenging", desc: "Push my limits safely" },
];

export default function WorkoutPickerModal({ onConfirm, onClose }) {
  const [types, setTypes] = useState([]);
  const [intensity, setIntensity] = useState(null);
  const [demoCaption, setDemoCaption] = useState("");
  const [demoPressing, setDemoPressing] = useState(false);
  const timersRef = useRef([]);

  const isTourPicking = typeof window !== "undefined" &&
    (window.fitabilityTourStep === "workout_picking" || window.fitabilityTourStep === "workout");

  useEffect(() => {
    if (!isTourPicking) return;
    const t1 = setTimeout(() => setDemoCaption("Pick the kinds of movement you want — you can choose more than one."), 150);
    const t2 = setTimeout(() => setTypes(["strength"]), 600);
    const t3 = setTimeout(() => setTypes(["strength", "cardio"]), 1700);
    const t4 = setTimeout(() => setDemoCaption("Then choose how hard to push today."), 2700);
    const t5 = setTimeout(() => setIntensity("easy"), 3700);
    const t6 = setTimeout(() => { setDemoCaption("Now tapping Start to build it…"); setDemoPressing(true); }, 4900);
    const t7 = setTimeout(() => { onConfirm({ workoutTypes: ["strength", "cardio"], intensity: "easy" }); onClose(); }, 5800);
    timersRef.current = [t1, t2, t3, t4, t5, t6, t7];
    return () => timersRef.current.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleType = (id) => {
    if (isTourPicking) return;
    setTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    onConfirm({ workoutTypes: types, intensity });
    onClose();
  };

  const canConfirm = types.length > 0 && intensity;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      {isTourPicking && <div className="absolute inset-0 z-[60]" aria-hidden="true" />}
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] my-auto md:my-0 mb-20 md:mb-0">
        {isTourPicking && (
          <div className="tour-demo-label px-5 pt-4">DEMO</div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="font-heading font-bold text-lg">Choose Your Workout</h2>
          {!isTourPicking && (
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {demoCaption && (
          <p className="px-5 pb-2 text-sm text-primary font-medium animate-pulse">{demoCaption}</p>
        )}

        <div className="overflow-y-auto flex-1 px-5 pt-1 space-y-5">
          {/* Workout Type */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">What type of workout? (choose one or more)</p>
            <div className="grid grid-cols-2 gap-2">
              {WORKOUT_TYPES.map(t => {
                const Icon = t.icon;
                const selected = types.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleType(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    } ${t.id === "mixed" ? "col-span-2" : ""}`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? "text-primary" : ""}`} />
                    <div>
                      <div className={`text-sm font-semibold ${selected ? "text-foreground" : ""}`}>{t.label}</div>
                      <div className="text-xs opacity-70">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">How intense?</p>
            <div className="grid grid-cols-2 gap-2">
              {INTENSITIES.map(i => {
                const selected = intensity === i.id;
                return (
                  <button
                    key={i.id}
                    onClick={() => setIntensity(i.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{i.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{i.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>



        </div>

        {/* Sticky footer button */}
         <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-border">
           <Button
             onClick={handleConfirm}
             disabled={!canConfirm}
             className={demoPressing ? "w-full h-12 text-base bg-green-600 text-white hover:bg-green-600" : "w-full h-12 text-base"}
           >
             {demoPressing ? (
               <>
                 <Check className="w-5 h-5 mr-2" />
                 Got it!
               </>
             ) : (
               "Generate My Workout ✨"
             )}
           </Button>
         </div>
      </div>
    </div>
  );
}