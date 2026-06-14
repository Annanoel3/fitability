import React, { useState } from "react";
import { Shield } from "lucide-react";

// Tap zones: id, label, and approximate center positions (as % of 200x500 viewBox)
// front: [cx, cy], back: [cx, cy] — null means zone not visible on that side
const BODY_ZONES = [
  { id: "head",           label: "Head / Neck",        front: [100, 38],   back: [100, 38]   },
  { id: "left_shoulder",  label: "Left Shoulder",       front: [65, 105],   back: [65, 105]   },
  { id: "right_shoulder", label: "Right Shoulder",      front: [135, 105],  back: [135, 105]  },
  { id: "chest",          label: "Chest",               front: [100, 135],  back: null        },
  { id: "upper_back",     label: "Upper Back",          front: null,        back: [100, 130]  },
  { id: "lower_back",     label: "Lower Back",          front: null,        back: [100, 175]  },
  { id: "left_arm",       label: "Left Arm / Elbow",    front: [58, 168],   back: [58, 168]   },
  { id: "right_arm",      label: "Right Arm / Elbow",   front: [142, 168],  back: [142, 168]  },
  { id: "left_wrist",     label: "Left Wrist / Hand",   front: [50, 220],   back: [50, 220]   },
  { id: "right_wrist",    label: "Right Wrist / Hand",  front: [150, 220],  back: [150, 220]  },
  { id: "abdomen",        label: "Abdomen / Core",      front: [100, 172],  back: null        },
  { id: "left_hip",       label: "Left Hip",            front: [76, 240],   back: [76, 240]   },
  { id: "right_hip",      label: "Right Hip",           front: [124, 240],  back: [124, 240]  },
  { id: "left_knee",      label: "Left Knee",           front: [76, 340],   back: [76, 340]   },
  { id: "right_knee",     label: "Right Knee",          front: [124, 340],  back: [124, 340]  },
  { id: "left_ankle",     label: "Left Ankle / Foot",   front: [78, 445],   back: [78, 445]   },
  { id: "right_ankle",    label: "Right Ankle / Foot",  front: [122, 445],  back: [122, 445]  },
];

function FrontBody() {
  return (
    <g fill="#c8d4dc" stroke="#8aa0b0" strokeWidth="1.2" strokeLinejoin="round">
      {/* Head */}
      <ellipse cx="100" cy="34" rx="22" ry="26" />
      {/* Neck */}
      <path d="M90,58 Q90,72 86,76 L114,76 Q110,72 110,58 Z" />
      {/* Trapezius / shoulders slope */}
      <path d="M86,76 Q72,78 58,92 L54,100 Q62,96 70,100 Q74,88 90,84 L110,84 Q126,88 130,100 Q138,96 146,100 L142,92 Q128,78 114,76 Z" />
      {/* Torso */}
      <path d="M70,100 Q64,110 63,130 L63,205 Q68,215 76,218 L80,205 L80,135 Q84,115 88,108 L112,108 Q116,115 120,135 L120,205 L124,218 Q132,215 137,205 L137,130 Q136,110 130,100 Z" />
      {/* Left upper arm */}
      <path d="M58,92 Q48,98 44,120 L42,155 Q46,162 52,160 L56,125 Q58,105 70,100 Z" />
      {/* Right upper arm */}
      <path d="M142,92 Q152,98 156,120 L158,155 Q154,162 148,160 L144,125 Q142,105 130,100 Z" />
      {/* Left forearm */}
      <path d="M42,155 Q38,175 38,200 L44,208 Q50,210 54,206 L54,178 L52,160 Z" />
      {/* Right forearm */}
      <path d="M158,155 Q162,175 162,200 L156,208 Q150,210 146,206 L146,178 L148,160 Z" />
      {/* Left hand */}
      <path d="M38,200 Q34,212 35,222 Q38,228 44,226 Q46,232 50,230 Q52,235 56,232 Q58,237 62,233 Q65,226 62,218 L54,206 Z" />
      {/* Right hand */}
      <path d="M162,200 Q166,212 165,222 Q162,228 156,226 Q154,232 150,230 Q148,235 144,232 Q142,237 138,233 Q135,226 138,218 L146,206 Z" />
      {/* Pelvis */}
      <path d="M63,205 Q63,225 68,235 L76,248 Q88,255 100,255 Q112,255 124,248 L132,235 Q137,225 137,205 L124,218 L120,205 L80,205 L76,218 Z" />
      {/* Left thigh */}
      <path d="M68,235 Q64,258 64,285 L64,310 Q70,318 78,316 L80,288 L80,248 L76,248 Z" />
      {/* Right thigh */}
      <path d="M132,235 Q136,258 136,285 L136,310 Q130,318 122,316 L120,288 L120,248 L124,248 Z" />
      {/* Left knee cap */}
      <ellipse cx="72" cy="322" rx="10" ry="8" />
      {/* Right knee cap */}
      <ellipse cx="128" cy="322" rx="10" ry="8" />
      {/* Left shin */}
      <path d="M64,310 Q62,335 63,360 L65,388 Q68,395 74,394 L78,366 L78,328 L78,316 Z" />
      {/* Right shin */}
      <path d="M136,310 Q138,335 137,360 L135,388 Q132,395 126,394 L122,366 L122,328 L122,316 Z" />
      {/* Left foot */}
      <path d="M65,388 Q62,400 62,410 Q62,420 68,424 Q74,426 80,424 L82,416 Q84,408 82,396 L74,394 Z" />
      {/* Right foot */}
      <path d="M135,388 Q138,400 138,410 Q138,420 132,424 Q126,426 120,424 L118,416 Q116,408 118,396 L126,394 Z" />
      {/* Collar bones */}
      <path d="M86,80 Q92,84 100,84 Q108,84 114,80" fill="none" stroke="#8aa0b0" strokeWidth="1" />
      {/* Navel */}
      <circle cx="100" cy="168" r="2.5" fill="#8aa0b0" />
    </g>
  );
}

function BackBody() {
  return (
    <g fill="#c8d4dc" stroke="#8aa0b0" strokeWidth="1.2" strokeLinejoin="round">
      {/* Head */}
      <ellipse cx="100" cy="34" rx="22" ry="26" />
      {/* Neck */}
      <path d="M90,58 Q90,72 86,76 L114,76 Q110,72 110,58 Z" />
      {/* Trapezius */}
      <path d="M86,76 Q72,78 58,92 L54,100 Q62,96 70,100 Q74,88 90,84 L110,84 Q126,88 130,100 Q138,96 146,100 L142,92 Q128,78 114,76 Z" />
      {/* Back torso */}
      <path d="M70,100 Q64,110 63,130 L63,205 Q68,215 76,218 L80,205 L80,135 Q84,115 88,108 L112,108 Q116,115 120,135 L120,205 L124,218 Q132,215 137,205 L137,130 Q136,110 130,100 Z" />
      {/* Spine line */}
      <line x1="100" y1="84" x2="100" y2="205" stroke="#8aa0b0" strokeWidth="0.8" strokeDasharray="3,3" />
      {/* Left upper arm */}
      <path d="M58,92 Q48,98 44,120 L42,155 Q46,162 52,160 L56,125 Q58,105 70,100 Z" />
      {/* Right upper arm */}
      <path d="M142,92 Q152,98 156,120 L158,155 Q154,162 148,160 L144,125 Q142,105 130,100 Z" />
      {/* Left forearm */}
      <path d="M42,155 Q38,175 38,200 L44,208 Q50,210 54,206 L54,178 L52,160 Z" />
      {/* Right forearm */}
      <path d="M158,155 Q162,175 162,200 L156,208 Q150,210 146,206 L146,178 L148,160 Z" />
      {/* Left hand */}
      <path d="M38,200 Q34,212 35,222 Q38,228 44,226 Q46,232 50,230 Q52,235 56,232 Q58,237 62,233 Q65,226 62,218 L54,206 Z" />
      {/* Right hand */}
      <path d="M162,200 Q166,212 165,222 Q162,228 156,226 Q154,232 150,230 Q148,235 144,232 Q142,237 138,233 Q135,226 138,218 L146,206 Z" />
      {/* Glutes / pelvis back */}
      <path d="M63,205 Q62,225 66,238 Q76,258 100,260 Q124,258 134,238 Q138,225 137,205 L124,218 L120,205 L80,205 L76,218 Z" />
      {/* Left thigh back */}
      <path d="M66,238 Q62,260 62,285 L62,310 Q68,318 76,316 L80,290 L80,250 Q88,260 100,260 L80,248 Z" />
      {/* Right thigh back */}
      <path d="M134,238 Q138,260 138,285 L138,310 Q132,318 124,316 L120,290 L120,250 Q112,260 100,260 L120,248 Z" />
      {/* Left knee back */}
      <ellipse cx="70" cy="320" rx="10" ry="8" />
      {/* Right knee back */}
      <ellipse cx="130" cy="320" rx="10" ry="8" />
      {/* Left calf */}
      <path d="M62,310 Q58,335 60,362 L62,388 Q67,396 74,395 L76,366 L76,328 L76,316 Z" />
      {/* Right calf */}
      <path d="M138,310 Q142,335 140,362 L138,388 Q133,396 126,395 L124,366 L124,328 L124,316 Z" />
      {/* Left heel/foot */}
      <path d="M62,388 Q60,400 62,412 Q64,422 72,424 Q78,424 82,420 L80,408 L76,395 Z" />
      {/* Right heel/foot */}
      <path d="M138,388 Q140,400 138,412 Q136,422 128,424 Q122,424 118,420 L120,408 L124,395 Z" />
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

      {/* Body diagram */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 470"
          className="w-44 h-auto select-none drop-shadow-sm"
        >
          {view === "front" ? <FrontBody /> : <BackBody />}

          {/* Tap zones */}
          {visibleZones.map(zone => {
            const [cx, cy] = view === "front" ? zone.front : zone.back;
            const isMarked = marked.includes(zone.id);

            return (
              <g
                key={zone.id}
                onClick={() => toggleZone(zone.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Invisible large hit area */}
                <circle cx={cx} cy={cy} r="20" fill="transparent" />
                {isMarked && (
                  <>
                    {/* Red circle */}
                    <circle cx={cx} cy={cy} r="13" fill="hsl(0 72% 51%)" opacity="0.85" />
                    {/* X mark */}
                    <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={cx + 6} y1={cy - 6} x2={cx - 6} y2={cy + 6} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </>
                )}
                {!isMarked && (
                  /* Subtle dot hint */
                  <circle cx={cx} cy={cy} r="6" fill="hsl(var(--primary))" opacity="0.2" />
                )}
              </g>
            );
          })}
        </svg>
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