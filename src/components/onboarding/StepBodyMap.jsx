import React, { useState } from "react";
import { Shield } from "lucide-react";

// The Canva SVG — front body on left half, back body on right half
// Displayed SVG viewBox: 792 x 612
// We show it at full width and overlay tap zones on both halves
const SVG_URL = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/d8a11d3f0_Untitleddesign.svg";

// Tap zone positions as percentages of the displayed image (0-100)
// Each zone has front (left body) and back (right body) positions
// Coords are [x%, y%] within the image
const BODY_ZONES = [
  { id: "head",           label: "Head / Neck",        front: [25, 8],   back: [75, 8]   },
  { id: "left_shoulder",  label: "Left Shoulder",       front: [17, 22],  back: [17+50, 22]  },
  { id: "right_shoulder", label: "Right Shoulder",      front: [33, 22],  back: [33+50, 22]  },
  { id: "chest",          label: "Chest",               front: [25, 32],  back: null          },
  { id: "upper_back",     label: "Upper Back",          front: null,      back: [75, 30]      },
  { id: "lower_back",     label: "Lower Back",          front: null,      back: [75, 42]      },
  { id: "left_arm",       label: "Left Arm / Elbow",    front: [13, 40],  back: [13+50, 40]  },
  { id: "right_arm",      label: "Right Arm / Elbow",   front: [37, 40],  back: [37+50, 40]  },
  { id: "left_wrist",     label: "Left Wrist / Hand",   front: [11, 54],  back: [11+50, 54]  },
  { id: "right_wrist",    label: "Right Wrist / Hand",  front: [39, 54],  back: [39+50, 54]  },
  { id: "abdomen",        label: "Abdomen / Core",      front: [25, 44],  back: null          },
  { id: "left_hip",       label: "Left Hip",            front: [20, 58],  back: [20+50, 58]  },
  { id: "right_hip",      label: "Right Hip",           front: [30, 58],  back: [30+50, 58]  },
  { id: "left_knee",      label: "Left Knee",           front: [20, 75],  back: [20+50, 75]  },
  { id: "right_knee",     label: "Right Knee",          front: [30, 75],  back: [30+50, 75]  },
  { id: "left_ankle",     label: "Left Ankle / Foot",   front: [21, 93],  back: [21+50, 93]  },
  { id: "right_ankle",    label: "Right Ankle / Foot",  front: [29, 93],  back: [29+50, 93]  },
];

export default function StepBodyMap({ data, onChange }) {
  const [view, setView] = useState("front");
  const marked = data.marked_zones || [];

  const toggleZone = (zoneId) => {
    const next = marked.includes(zoneId)
      ? marked.filter(z => z !== zoneId)
      : [...marked, zoneId];
    onChange({ marked_zones: next });
  };

  // Only show zones relevant to the current view
  const visibleZones = BODY_ZONES.filter(z =>
    view === "front" ? z.front !== null : z.back !== null
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Where do you have pain or issues?</h2>
        <p className="text-muted-foreground mt-1 text-sm">Tap any area to mark it. You'll describe each one on the next step.</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Used <strong>only</strong> to keep unsafe exercises out of your workouts.
        </p>
      </div>

      {/* Front / Back toggle */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setView("front")}
          className={`px-8 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
            view === "front"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          Front
        </button>
        <button
          onClick={() => setView("back")}
          className={`px-8 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
            view === "back"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          Back
        </button>
      </div>

      {/* Body diagram — image with tap zones overlaid */}
      <div className="flex justify-center">
        <div className="relative select-none" style={{ width: "280px" }}>
          <img
            src={SVG_URL}
            alt="Body diagram"
            className="w-full h-auto"
            style={{
              // Crop to show only the relevant half
              objectFit: "cover",
              objectPosition: view === "front" ? "left center" : "right center",
              width: "280px",
              // Clip via overflow hidden on parent — handled by cropping below
            }}
          />

          {/* Tap zones — positioned absolutely as % of container */}
          {visibleZones.map(zone => {
            const pos = view === "front" ? zone.front : zone.back;
            if (!pos) return null;
            const isMarked = marked.includes(zone.id);

            // For front view, positions are in 0-50% of image width
            // For back view, positions are in 50-100% of image width
            // We re-map to the cropped half (0-100% of displayed container)
            const xPct = view === "front" ? pos[0] * 2 : (pos[0] - 50) * 2;
            const yPct = pos[1];

            return (
              <button
                key={zone.id}
                onClick={() => toggleZone(zone.id)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  width: "36px",
                  height: "36px",
                  background: isMarked ? "hsla(0, 72%, 51%, 0.85)" : "hsla(var(--primary), 0.15)",
                  border: isMarked ? "2px solid hsl(0, 72%, 51%)" : "2px solid hsla(var(--primary), 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={zone.label}
              >
                {isMarked ? (
                  <span style={{ color: "white", fontWeight: "bold", fontSize: "16px", lineHeight: 1 }}>×</span>
                ) : (
                  <span style={{ color: "hsl(var(--primary))", fontWeight: "bold", fontSize: "10px", lineHeight: 1 }}>+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Marked tags */}
      {marked.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center font-medium">Marked areas — tap to remove:</p>
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