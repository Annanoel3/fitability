import React, { useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";

const FRONT_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/e4407373c_bodyfront.svg";
const BACK_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/a805393a8_bodyback.svg";

const FRONT_W = 151.92, FRONT_H = 352.32;
const F = (tx, ty, w, h, s=0.24) => [(tx + w*s/2) / FRONT_W * 100, (ty + h*s/2) / FRONT_H * 100];

const ZONES = [
  { id: "head",           label: "Head / Neck",            front: [50, 8],   back: [50, 8]   },
  { id: "neck",           label: "Neck / Upper Back",      front: [50, 16],  back: [50, 16]  },
  { id: "left_shoulder",  label: "Left Shoulder",          front: [28, 22],  back: [28, 22]  },
  { id: "right_shoulder", label: "Right Shoulder",         front: [72, 22],  back: [72, 22]  },
  { id: "chest",          label: "Chest",                  front: [50, 26],  back: null       },
  { id: "upper_back",     label: "Upper Back",             front: null,      back: [50, 26]  },
  { id: "abdomen",        label: "Abdomen",                front: F(45.36, 113.04, 257, 127), back: null },
  { id: "lower_back",     label: "Lower Back",             front: null,      back: [50, 38]  },
  { id: "left_arm",       label: "Left Arm",               front: [17, 30],  back: [17, 30]  },
  { id: "right_arm",      label: "Right Arm",              front: [83, 30],  back: [83, 30]  },
  { id: "left_forearm",   label: "Left Forearm / Elbow",   front: [14, 41],  back: [14, 41]  },
  { id: "right_forearm",  label: "Right Forearm / Elbow",  front: [86, 41],  back: [86, 41]  },
  { id: "left_wrist",     label: "Left Wrist / Hand",      front: [11, 53],  back: [11, 53]  },
  { id: "right_wrist",    label: "Right Wrist / Hand",     front: [89, 53],  back: [89, 53]  },
  { id: "left_hip",       label: "Left Hip / Glute",       front: F(40.56, 143.28, 148, 146), back: [35, 48] },
  { id: "right_hip",      label: "Right Hip / Glute",      front: F(75.84, 143.28, 148, 148), back: [65, 48] },
  { id: "left_thigh",     label: "Left Thigh",             front: [36, 58],  back: [36, 60]  },
  { id: "right_thigh",    label: "Right Thigh",            front: [64, 58],  back: [64, 60]  },
  { id: "left_knee",      label: "Left Knee",              front: [36, 69],  back: [36, 69]  },
  { id: "right_knee",     label: "Right Knee",             front: [64, 69],  back: [64, 69]  },
  { id: "left_calf",      label: "Left Shin / Calf",       front: F(40.8, 260.4, 103, 209),   back: [36, 79]  },
  { id: "right_calf",     label: "Right Shin / Calf",      front: F(86.64, 259.92, 103, 204), back: [64, 79]  },
  { id: "left_foot",      label: "Left Foot / Ankle",      front: F(48.24, 310.32, 69, 75),   back: [36, 92]  },
  { id: "right_foot",     label: "Right Foot / Ankle",     front: F(87.12, 308.64, 70, 85),   back: [64, 92]  },
];

export default function StepBodyMap({ data, onChange }) {
  const [view, setView] = useState("front");
  const marked = data.marked_zones || [];
  const toggleRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      toggleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const toggle = (id) => {
    const next = marked.includes(id)
      ? marked.filter(z => z !== id)
      : [...marked, id];
    onChange({ marked_zones: next });
  };

  const visibleZones = ZONES.filter(z => view === "front" ? z.front !== null : z.back !== null);

  const BOX_H = 370;
  const imgW = Math.round(BOX_H * FRONT_W / FRONT_H);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Where do you have pain or issues?</h2>
        <p className="text-muted-foreground mt-1 text-sm">Tap any body part to mark it. We'll ask about each area next.</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">Used <strong>only</strong> to keep unsafe exercises out of your workouts.</p>
      </div>

      <div ref={toggleRef} className="flex justify-center gap-3">
        {["front", "back"].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-10 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              view === v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <div className="relative select-none" style={{ height: `${BOX_H}px`, width: `${imgW}px` }}>
          <img
            src={view === "front" ? FRONT_SVG : BACK_SVG}
            alt={`${view} body diagram`}
            style={{ position: "absolute", left: view === "back" ? "32px" : 0, top: 0, width: "100%", height: "100%", transform: view === "back" ? "scale(1.3)" : "scale(1)", transformOrigin: "center" }}
            draggable={false}
          />
          {visibleZones.map(zone => {
            const pos = view === "front" ? zone.front : zone.back;
            const isMarked = marked.includes(zone.id);
            return (
              <button
                key={zone.id}
                onClick={() => toggle(zone.id)}
                title={zone.label}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all hover:scale-110"
                style={{
                  left: `${pos[0]}%`,
                  top: `${pos[1]}%`,
                  width: "26px",
                  height: "26px",
                  background: isMarked ? "hsla(0, 72%, 51%, 0.85)" : "hsla(174, 58%, 39%, 0.18)",
                  border: isMarked ? "2px solid hsl(0, 72%, 51%)" : "2px solid hsla(174, 58%, 39%, 0.5)",
                }}
              />
            );
          })}
        </div>
      </div>

      {marked.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center font-medium">Marked — tap to remove:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {marked.map(id => {
              const zone = ZONES.find(z => z.id === id);
              return (
                <button
                  key={id}
                  onClick={() => toggle(id)}
                  className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/30 rounded-full text-xs font-medium"
                >
                  {zone?.label} ×
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Nothing marked — tap Continue to skip.</p>
      )}
    </div>
  );
}