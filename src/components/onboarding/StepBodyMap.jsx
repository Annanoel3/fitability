import React, { useState } from "react";
import { Shield } from "lucide-react";

// Each zone: id, label, cx/cy for front, cx/cy for back (as % of SVG viewBox 200x400)
const BODY_ZONES = [
  { id: "head",          label: "Head / Neck",       front: [100, 30],   back: [100, 30]  },
  { id: "left_shoulder", label: "Left Shoulder",      front: [62, 95],    back: [62, 95]   },
  { id: "right_shoulder",label: "Right Shoulder",     front: [138, 95],   back: [138, 95]  },
  { id: "chest",         label: "Chest",              front: [100, 115],  back: null       },
  { id: "upper_back",    label: "Upper Back",         front: null,        back: [100, 115] },
  { id: "lower_back",    label: "Lower Back",         front: null,        back: [100, 160] },
  { id: "left_arm",      label: "Left Arm / Elbow",   front: [52, 145],   back: [52, 145]  },
  { id: "right_arm",     label: "Right Arm / Elbow",  front: [148, 145],  back: [148, 145] },
  { id: "left_wrist",    label: "Left Wrist / Hand",  front: [45, 195],   back: [45, 195]  },
  { id: "right_wrist",   label: "Right Wrist / Hand", front: [155, 195],  back: [155, 195] },
  { id: "abdomen",       label: "Abdomen / Core",     front: [100, 155],  back: null       },
  { id: "left_hip",      label: "Left Hip",           front: [74, 215],   back: [74, 215]  },
  { id: "right_hip",     label: "Right Hip",          front: [126, 215],  back: [126, 215] },
  { id: "left_knee",     label: "Left Knee",          front: [74, 290],   back: [74, 290]  },
  { id: "right_knee",    label: "Right Knee",         front: [126, 290],  back: [126, 290] },
  { id: "left_ankle",    label: "Left Ankle / Foot",  front: [74, 370],   back: [74, 370]  },
  { id: "right_ankle",   label: "Right Ankle / Foot", front: [126, 370],  back: [126, 370] },
];

// Simple SVG body silhouette paths (front and back are mirrored)
function BodySilhouette({ view }) {
  return (
    <g opacity="0.15">
      {/* Head */}
      <ellipse cx="100" cy="28" rx="20" ry="24" fill="currentColor" />
      {/* Neck */}
      <rect x="92" y="50" width="16" height="18" rx="4" fill="currentColor" />
      {/* Torso */}
      <path d="M62 68 Q60 70 58 85 L52 230 Q65 235 100 236 Q135 235 148 230 L142 85 Q140 70 138 68 Z" fill="currentColor" />
      {/* Left arm */}
      <path d="M62 68 Q48 75 44 100 L38 200 Q42 205 50 202 L56 105 Q60 82 68 78 Z" fill="currentColor" />
      {/* Right arm */}
      <path d="M138 68 Q152 75 156 100 L162 200 Q158 205 150 202 L144 105 Q140 82 132 78 Z" fill="currentColor" />
      {/* Left hand */}
      <ellipse cx="44" cy="208" rx="8" ry="12" fill="currentColor" />
      {/* Right hand */}
      <ellipse cx="156" cy="208" rx="8" ry="12" fill="currentColor" />
      {/* Left leg */}
      <path d="M74 232 Q68 240 67 265 L66 380 Q72 385 80 382 L82 268 Q83 245 88 234 Z" fill="currentColor" />
      {/* Right leg */}
      <path d="M126 232 Q132 240 133 265 L134 380 Q128 385 120 382 L118 268 Q117 245 112 234 Z" fill="currentColor" />
      {/* Left foot */}
      <ellipse cx="72" cy="385" rx="10" ry="7" fill="currentColor" />
      {/* Right foot */}
      <ellipse cx="128" cy="385" rx="10" ry="7" fill="currentColor" />
    </g>
  );
}

export default function StepBodyMap({ data, onChange }) {
  const [view, setView] = useState("front");
  const marked = data.marked_zones || [];

  const toggleZone = (zoneId) => {
    const next = marked.includes(zoneId)
      ? marked.filter(z => z !== zoneId)
      : [...marked, zoneId];
    onChange({ marked_zones: next });
  };

  const visibleZones = BODY_ZONES.filter(z =>
    view === "front" ? z.front !== null : z.back !== null
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Where do you have pain or issues?</h2>
        <p className="text-muted-foreground mt-2 text-sm">Tap any area on the body to mark it. You'll describe each one next.</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Used <strong>only</strong> to keep unsafe exercises out of your workouts.
        </p>
      </div>

      {/* Front / Back toggle */}
      <div className="flex justify-center">
        <div className="bg-muted rounded-xl p-1 flex gap-1">
          {["front", "back"].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                view === v ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {v === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      </div>

      {/* Body diagram */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 400"
          className="w-48 h-auto select-none"
          style={{ color: "hsl(var(--foreground))" }}
        >
          <BodySilhouette view={view} />

          {visibleZones.map(zone => {
            const [cx, cy] = view === "front" ? zone.front : zone.back;
            const isMarked = marked.includes(zone.id);

            return (
              <g
                key={zone.id}
                onClick={() => toggleZone(zone.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Hit area */}
                <circle cx={cx} cy={cy} r="18" fill="transparent" />
                {/* Visual dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isMarked ? 11 : 8}
                  fill={isMarked ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  opacity={isMarked ? 1 : 0.35}
                  className="transition-all"
                />
                {isMarked && (
                  <>
                    <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={cx + 5} y1={cy - 5} x2={cx - 5} y2={cy + 5} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Marked list */}
      {marked.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center font-medium">Marked areas:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {marked.map(id => {
              const zone = BODY_ZONES.find(z => z.id === id);
              return (
                <button
                  key={id}
                  onClick={() => toggleZone(id)}
                  className="px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-full text-sm font-medium flex items-center gap-1.5"
                >
                  {zone?.label} <span className="opacity-60">×</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No areas marked — tap Continue to skip.
        </p>
      )}
    </div>
  );
}