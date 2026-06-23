import React, { useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";

const FRONT_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/e4407373c_bodyfront.svg";
const BACK_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/a805393a8_bodyback.svg";

// ViewBox dimensions
const FRONT_W = 151.92, FRONT_H = 352.32;
const BACK_W = 138.58, BACK_H = 360;

// Helper: convert SVG transform="translate(tx ty) scale(s)" + image (w, h) to % of viewBox
// cx = (tx + w*s/2) / VW * 100
// cy = (ty + h*s/2) / VH * 100
// Each zone: [xPct, yPct] relative to their respective SVG viewBox

// Helper: cx = (tx + w*scale/2) / VW * 100,  cy = (ty + h*scale/2) / VH * 100
// All back transforms from SVG file: viewBox="0 0 138.58 360"
const B = (tx, ty, w, h, s=0.24) => [(tx + w*s/2) / BACK_W * 100, (ty + h*s/2) / BACK_H * 100];
const F = (tx, ty, w, h, s=0.24) => [(tx + w*s/2) / FRONT_W * 100, (ty + h*s/2) / FRONT_H * 100];

const ZONES = [
  {
    id: "head",
    label: "Head / Neck",
    // back_head_Image: translate(50.28 3.96) scale(.24), w=158 h=161
    back:  B(50.28, 3.96, 158, 161),
    front: [50, 8],
  },
  {
    id: "neck",
    label: "Neck / Upper Back",
    // back_neck_Image: translate(46.2 42.6) scale(.24), w=193 h=62
    back:  B(46.2, 42.6, 193, 62),
    front: [50, 16],
  },
  {
    id: "left_shoulder",
    label: "Left Shoulder",
    // back_left_shoulder_Image: translate(17.88 57.48) scale(.24), w=190 h=150
    back:  B(17.88, 57.48, 190, 150),
    front: [28, 22],
  },
  {
    id: "right_shoulder",
    label: "Right Shoulder",
    // back_right_shoulder_Image: translate(91.56 57.48) scale(.24), w=121 h=142
    back:  B(91.56, 57.48, 121, 142),
    front: [72, 22],
  },
  {
    id: "chest",
    label: "Chest",
    back:  null,
    front: [50, 26],
  },
  {
    id: "upper_back",
    label: "Upper Back",
    // back_upper_Image: translate(34.92 57.48) scale(.24), w=289 h=280
    back:  B(34.92, 57.48, 289, 280),
    front: null,
  },
  {
    id: "abdomen",
    label: "Abdomen",
    back:  null,
    front: F(45.36, 113.04, 257, 127),
  },
  {
    id: "lower_back",
    label: "Lower Back",
    // back_lower_Image: translate(35.64 124.68) scale(.24), w=281 h=176
    back:  B(35.64, 124.68, 281, 176),
    front: null,
  },
  {
    id: "left_arm",
    label: "Left Arm",
    // back_left_arm_Image: translate(12.12 93.48) scale(.24), w=95 h=146
    back:  B(12.12, 93.48, 95, 146),
    front: [17, 30],
  },
  {
    id: "right_arm",
    label: "Right Arm",
    // back_right_arm_Image: translate(104.28 91.56) scale(.24), w=96 h=162
    back:  B(104.28, 91.56, 96, 162),
    front: [83, 30],
  },
  {
    id: "left_forearm",
    label: "Left Forearm / Elbow",
    // back_left_forearm_Image: translate(7.32 128.52) scale(.24), w=101 h=160
    back:  B(7.32, 128.52, 101, 160),
    front: [14, 41],
  },
  {
    id: "right_forearm",
    label: "Right Forearm / Elbow",
    // back_right_forearm_Image: translate(106.68 130.44) scale(.24), w=103 h=152
    back:  B(106.68, 130.44, 103, 152),
    front: [86, 41],
  },
  {
    id: "left_wrist",
    label: "Left Wrist / Hand",
    // back_left_hand_Image: translate(3.96 178.92) scale(.24), w=74 h=125
    back:  B(3.96, 178.92, 74, 125),
    front: [11, 56],
  },
  {
    id: "right_wrist",
    label: "Right Wrist / Hand",
    // back_right_wrist_Image: translate(119.64 166.92) scale(.24), w=53 h=42  (wrist marker)
    // back_right_hand_Image: translate(117 177) scale(.24), w=74 h=135
    back:  B(117, 177, 74, 135),
    front: [89, 56],
  },
  {
    id: "left_hip",
    label: "Left Hip / Glute",
    // back_left_hip_Image: translate(32.76 166.92) scale(.24), w=155 h=156
    back:  B(32.76, 166.92, 155, 156),
    front: F(40.56, 143.28, 148, 146),
  },
  {
    id: "right_hip",
    label: "Right Hip / Glute",
    // back_right_hip_Image: translate(69.96 166.92) scale(.24), w=150 h=156
    back:  B(69.96, 166.92, 150, 156),
    front: F(75.84, 143.28, 148, 148),
  },
  {
    id: "left_thigh",
    label: "Left Thigh",
    // back_left_thigh_Image: translate(33 204.36) scale(.24), w=156 h=142
    back:  B(33, 204.36, 156, 142),
    front: [36, 58],
  },
  {
    id: "right_thigh",
    label: "Right Thigh",
    // back_right_thigh_Image: translate(70.44 204.36) scale(.24), w=146 h=142
    back:  B(70.44, 204.36, 146, 142),
    front: [64, 58],
  },
  {
    id: "left_knee",
    label: "Left Knee",
    // back_left_knee_Image: translate(39.24 238.44) scale(.24), w=101 h=86
    back:  B(39.24, 238.44, 101, 86),
    front: [36, 69],
  },
  {
    id: "right_knee",
    label: "Right Knee",
    // back_right_knee_Image: translate(75.24 238.44) scale(.24), w=101 h=88
    back:  B(75.24, 238.44, 101, 88),
    front: [64, 69],
  },
  {
    id: "left_calf",
    label: "Left Shin / Calf",
    // back_left_calf_Image: translate(39 259.08) scale(.24), w=113 h=234
    back:  B(39, 259.08, 113, 234),
    front: F(40.8, 260.4, 103, 209),
  },
  {
    id: "right_calf",
    label: "Right Shin / Calf",
    // back_right_calf_Image: translate(72.6 259.56) scale(.24), w=112 h=238
    back:  B(72.6, 259.56, 112, 238),
    front: F(86.64, 259.92, 103, 204),
  },
  {
    id: "left_foot",
    label: "Left Foot / Ankle",
    // back_left_achilles_Image: translate(45.72 315.24) scale(.24), w=71 h=76
    back:  B(45.72, 315.24, 71, 76),
    front: F(48.24, 310.32, 69, 75),
  },
  {
    id: "right_foot",
    label: "Right Foot / Ankle",
    // back_right_achilles_Image: translate(76.2 316.68) scale(.24), w=70 h=76
    back:  B(76.2, 316.68, 70, 76),
    front: F(87.12, 308.64, 70, 85),
  },
];

export default function StepBodyMap({ data, onChange }) {
  const [view, setView] = useState("front");
  const marked = data.marked_zones || [];
  const toggleRef = useRef(null);

  // Auto-scroll so the toggle + diagram are at the top on mount
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
  const frontW = Math.round(BOX_H * FRONT_W / FRONT_H); // ~159
  const backW  = Math.round(BOX_H * BACK_W  / BACK_H);  // ~219
  const imgW   = view === "front" ? frontW : backW;

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

      {/* Body diagram */}
      <div className="flex justify-center">
        <div className="relative select-none" style={{ height: `${BOX_H}px`, width: `${imgW}px` }}>
          <img
            src={view === "front" ? FRONT_SVG : BACK_SVG}
            alt={`${view} body diagram`}
            style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
            draggable={false}
          />

          {visibleZones.map(zone => {
            const pos = view === "front" ? zone.front : zone.back;
            const isMarked = marked.includes(zone.id);
            const leftPct = pos[0];

            return (
              <button
                key={zone.id}
                onClick={() => toggle(zone.id)}
                title={zone.label}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all hover:scale-110"
                style={{
                  left: `${leftPct}%`,
                  top: `${pos[1]}%`,
                  width: "26px",
                  height: "26px",
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