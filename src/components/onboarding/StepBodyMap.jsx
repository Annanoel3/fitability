import React, { useState } from "react";
import { Shield } from "lucide-react";

const FRONT_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/e4407373c_bodyfront.svg";
const BACK_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/a805393a8_bodyback.svg";

// Zones with label and tap positions as % of SVG image (roughly 209x352 viewBox)
// front_x, front_y = position on front SVG; back_x, back_y = position on back SVG
// Values are percentage of the image width/height (0–100)
const ZONES = [
  { id: "head",             label: "Head / Neck",          front: [50, 7],   back: [50, 7]   },
  { id: "left_shoulder",    label: "Left Shoulder",         front: [30, 18],  back: [30, 18]  },
  { id: "right_shoulder",   label: "Right Shoulder",        front: [70, 18],  back: [70, 18]  },
  { id: "chest",            label: "Chest",                 front: [50, 27],  back: null       },
  { id: "upper_back",       label: "Upper Back",            front: null,      back: [50, 25]  },
  { id: "left_arm",         label: "Left Arm / Elbow",      front: [22, 38],  back: [22, 38]  },
  { id: "right_arm",        label: "Right Arm / Elbow",     front: [78, 38],  back: [78, 38]  },
  { id: "left_wrist",       label: "Left Wrist / Hand",     front: [14, 52],  back: [14, 52]  },
  { id: "right_wrist",      label: "Right Wrist / Hand",    front: [86, 52],  back: [86, 52]  },
  { id: "abdomen",          label: "Abdomen / Core",        front: [50, 42],  back: null       },
  { id: "lower_back",       label: "Lower Back",            front: null,      back: [50, 42]  },
  { id: "left_hip",         label: "Left Hip / Glute",      front: [34, 56],  back: [34, 56]  },
  { id: "right_hip",        label: "Right Hip / Glute",     front: [66, 56],  back: [66, 56]  },
  { id: "left_thigh",       label: "Left Thigh",            front: [36, 67],  back: [36, 67]  },
  { id: "right_thigh",      label: "Right Thigh",           front: [64, 67],  back: [64, 67]  },
  { id: "left_knee",        label: "Left Knee",             front: [37, 76],  back: [37, 76]  },
  { id: "right_knee",       label: "Right Knee",            front: [63, 76],  back: [63, 76]  },
  { id: "left_calf",        label: "Left Shin / Calf",      front: [37, 85],  back: [37, 85]  },
  { id: "right_calf",       label: "Right Shin / Calf",     front: [63, 85],  back: [63, 85]  },
  { id: "left_foot",        label: "Left Foot / Ankle",     front: [37, 95],  back: [37, 95]  },
  { id: "right_foot",       label: "Right Foot / Ankle",    front: [63, 95],  back: [63, 95]  },
];

export default function StepBodyMap({ data, onChange }) {
  const [view, setView] = useState("front");
  const marked = data.marked_zones || [];

  const toggle = (id) => {
    const next = marked.includes(id)
      ? marked.filter(z => z !== id)
      : [...marked, id];
    onChange({ marked_zones: next });
  };

  const visibleZones = ZONES.filter(z => view === "front" ? z.front !== null : z.back !== null);

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

      {/* Front / Back toggle */}
      <div className="flex justify-center gap-3">
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

      {/* Body diagram */}
      <div className="flex justify-center">
        <div className="relative select-none" style={{ width: "200px" }}>
          <img
            src={view === "front" ? FRONT_SVG : BACK_SVG}
            alt={`${view} body diagram`}
            className="w-full h-auto block"
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
                  width: "28px",
                  height: "28px",
                  background: isMarked
                    ? "hsla(0, 72%, 51%, 0.85)"
                    : "hsla(174, 58%, 39%, 0.18)",
                  border: isMarked
                    ? "2px solid hsl(0, 72%, 51%)"
                    : "2px solid hsla(174, 58%, 39%, 0.5)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Marked tags */}
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