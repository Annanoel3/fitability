import React, { useState } from "react";
import { Shield } from "lucide-react";

const FRONT_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/e4407373c_bodyfront.svg";
const BACK_SVG = "https://media.base44.com/images/public/6a2e01da2bef77611a127149/a805393a8_bodyback.svg";

// ViewBox dimensions
const FRONT_W = 151.92, FRONT_H = 352.32;
const BACK_W = 209.04, BACK_H = 352.08;

// Helper: convert SVG transform="translate(tx ty) scale(s)" + image (w, h) to % of viewBox
// cx = (tx + w*s/2) / VW * 100
// cy = (ty + h*s/2) / VH * 100
// Each zone: [xPct, yPct] relative to their respective SVG viewBox

const ZONES = [
  // ── BOTH VIEWS ──
  {
    id: "head",
    label: "Head / Neck",
    // back_head_Image: translate(46.32 0) scale(.24), w=158 h=161 → cx=(46.32+158*.24/2)/209.04 cy=(0+161*.24/2)/352.08
    back:  [( 46.32 + 158*.24/2) / BACK_W * 100,  ( 0    + 161*.24/2) / BACK_H * 100],
    // Front_head is not listed explicitly; using approximate center from known layers
    front: [50, 8],
  },
  {
    id: "neck",
    label: "Neck / Upper Back",
    // back_neck_Image: translate(42.24 38.64) scale(.24), w=193 h=62
    back:  [( 42.24 + 193*.24/2) / BACK_W * 100,  (38.64 + 62*.24/2)  / BACK_H * 100],
    front: [50, 16],
  },
  {
    id: "left_shoulder",
    label: "Left Shoulder",
    // back_left_shoulder_Image: translate(13.92 53.52) scale(.24), w=190 h=150
    back:  [(13.92 + 190*.24/2) / BACK_W * 100,  (53.52 + 150*.24/2) / BACK_H * 100],
    front: [28, 22],
  },
  {
    id: "right_shoulder",
    label: "Right Shoulder",
    // back_right_shoulder_Image: translate(87.6 53.52) scale(.24), w=121 h=142
    back:  [(87.6 + 121*.24/2) / BACK_W * 100,  (53.52 + 142*.24/2) / BACK_H * 100],
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
    // back_upper_Image: translate(30.96 53.52) scale(.24), w=289 h=280
    back:  [(30.96 + 289*.24/2) / BACK_W * 100, (53.52 + 280*.24/2) / BACK_H * 100],
    front: null,
  },
  {
    id: "abdomen",
    label: "Abdomen",
    // front_abdomen_Image: translate(45.36 113.04) scale(.24), w=257 h=127
    back:  null,
    front: [(45.36 + 257*.24/2) / FRONT_W * 100, (113.04 + 127*.24/2) / FRONT_H * 100],
  },
  {
    id: "lower_back",
    label: "Lower Back",
    // back_lower_Image: translate(31.68 120.72) scale(.24), w=281 h=176
    back:  [(31.68 + 281*.24/2) / BACK_W * 100, (120.72 + 176*.24/2) / BACK_H * 100],
    front: null,
  },
  {
    id: "left_arm",
    label: "Left Arm",
    // back_left_arm_Image (upper): translate(8.16 89.52) scale(.24), w=95 h=146
    back:  [(8.16  + 95*.24/2) / BACK_W * 100,  (89.52 + 146*.24/2) / BACK_H * 100],
    // front: figure's left arm = image's RIGHT side (~10% x)
    front: [9, 36],
  },
  {
    id: "right_arm",
    label: "Right Arm",
    // back_right_arm_Image: translate(100.32 87.6) scale(.24), w=96 h=162
    back:  [(100.32 + 96*.24/2) / BACK_W * 100,  (87.6 + 162*.24/2) / BACK_H * 100],
    // front: figure's right arm = image's LEFT side (~91% x)
    front: [91, 36],
  },
  {
    id: "left_forearm",
    label: "Left Forearm / Elbow",
    // back_left_forearm_Image: translate(3.36 124.56) scale(.24), w=101 h=160
    back:  [(3.36  + 101*.24/2) / BACK_W * 100,  (124.56 + 160*.24/2) / BACK_H * 100],
    // front: figure's left forearm = image's far right (~7% x)
    front: [7, 48],
  },
  {
    id: "right_forearm",
    label: "Right Forearm / Elbow",
    // back_right_forearm_Image: translate(102.72 126.48) scale(.24), w=103 h=152
    back:  [(102.72 + 103*.24/2) / BACK_W * 100, (126.48 + 152*.24/2) / BACK_H * 100],
    // front: figure's right forearm = image's far left (~93% x)
    front: [93, 48],
  },
  {
    id: "left_wrist",
    label: "Left Wrist / Hand",
    // back_left_hand_Image: translate(0 174.96) scale(.24), w=74 h=125
    back:  [(0    + 74*.24/2) / BACK_W * 100,  (174.96 + 125*.24/2) / BACK_H * 100],
    // front: figure's left hand = far right of image (~6% x)
    front: [6, 57],
  },
  {
    id: "right_wrist",
    label: "Right Wrist / Hand",
    // back_right_hand_Image: translate(113.04 173.04) scale(.24), w=74 h=135
    back:  [(113.04 + 74*.24/2) / BACK_W * 100,  (173.04 + 135*.24/2) / BACK_H * 100],
    // front: figure's right hand = far left of image (~94% x)
    front: [94, 57],
  },
  {
    id: "left_hip",
    label: "Left Hip / Glute",
    // back_left_hip_Image: translate(28.8 162.96) scale(.24), w=155 h=156
    back:  [(28.8  + 155*.24/2) / BACK_W * 100, (162.96 + 156*.24/2) / BACK_H * 100],
    // front_right_hip_Image: translate(40.56 143.28) scale(.24), w=148 h=146
    front: [(40.56 + 148*.24/2) / FRONT_W * 100, (143.28 + 146*.24/2) / FRONT_H * 100],
  },
  {
    id: "right_hip",
    label: "Right Hip / Glute",
    // back_right_hip_Image: translate(66 162.96) scale(.24), w=150 h=156
    back:  [(66    + 150*.24/2) / BACK_W * 100, (162.96 + 156*.24/2) / BACK_H * 100],
    // front_left_hip_Image: translate(75.84 143.28) scale(.24), w=148 h=148
    front: [(75.84 + 148*.24/2) / FRONT_W * 100, (143.28 + 148*.24/2) / FRONT_H * 100],
  },
  {
    id: "left_thigh",
    label: "Left Thigh",
    // back_left_thigh_Image: translate(29.04 200.4) scale(.24), w=156 h=142
    back:  [(29.04 + 156*.24/2) / BACK_W * 100, (200.4 + 142*.24/2) / BACK_H * 100],
    // front: figure's left thigh = right leg, mid-thigh
    front: [36, 58],
  },
  {
    id: "right_thigh",
    label: "Right Thigh",
    // back_right_thigh_Image: translate(66.48 200.4) scale(.24), w=146 h=142
    back:  [(66.48 + 146*.24/2) / BACK_W * 100, (200.4 + 142*.24/2) / BACK_H * 100],
    // front: figure's right thigh = left leg, mid-thigh
    front: [64, 58],
  },
  {
    id: "left_knee",
    label: "Left Knee",
    // back_left_knee_Image: translate(35.28 234.48) scale(.24), w=101 h=86
    back:  [(35.28 + 101*.24/2) / BACK_W * 100, (234.48 + 86*.24/2) / BACK_H * 100],
    // front: figure's left knee = right leg of image
    front: [36, 69],
  },
  {
    id: "right_knee",
    label: "Right Knee",
    // back_right_knee_Image: translate(71.28 234.48) scale(.24), w=101 h=88
    back:  [(71.28 + 101*.24/2) / BACK_W * 100, (234.48 + 88*.24/2) / BACK_H * 100],
    // front: figure's right knee = left leg of image
    front: [64, 69],
  },
  {
    id: "left_calf",
    label: "Left Shin / Calf",
    // back_left_calf_Image: translate(35.04 255.12) scale(.24), w=113 h=234
    back:  [(35.04 + 113*.24/2) / BACK_W * 100, (255.12 + 234*.24/2) / BACK_H * 100],
    // front_right_shin_Image: translate(40.8 260.4) scale(.24), w=103 h=209
    front: [(40.8 + 103*.24/2) / FRONT_W * 100, (260.4 + 209*.24/2) / FRONT_H * 100],
  },
  {
    id: "right_calf",
    label: "Right Shin / Calf",
    // back_right_calf_Image: translate(68.64 255.6) scale(.24), w=112 h=238
    back:  [(68.64 + 112*.24/2) / BACK_W * 100, (255.6 + 238*.24/2) / BACK_H * 100],
    // front_left_shin_Image: translate(86.64 259.92) scale(.24), w=103 h=204
    front: [(86.64 + 103*.24/2) / FRONT_W * 100, (259.92 + 204*.24/2) / FRONT_H * 100],
  },
  {
    id: "left_foot",
    label: "Left Foot / Ankle",
    // back_left_foot_Image: translate(35.28 0) scale(.24), w=724 h=1467 — this is the full background silhouette
    // back_left_achilles: translate(41.76 311.28), back_left_calf bottom ~ translate(35.04+113*.24, 255.12+234*.24)
    // Use achilles/ankle position
    back:  [(41.76 + 71*.24/2) / BACK_W * 100, (311.28 + 76*.24/2) / BACK_H * 100],
    // front_right_ankle: translate(48.24 310.32) scale(.24), w=69 h=75
    front: [(48.24 + 69*.24/2) / FRONT_W * 100, (310.32 + 75*.24/2) / FRONT_H * 100],
  },
  {
    id: "right_foot",
    label: "Right Foot / Ankle",
    // back_right_achilles: translate(72.24 312.72) scale(.24), w=70 h=76
    back:  [(72.24 + 70*.24/2) / BACK_W * 100, (312.72 + 76*.24/2) / BACK_H * 100],
    // front_left_ankle: translate(87.12 308.64) scale(.24), w=70 h=85
    front: [(87.12 + 70*.24/2) / FRONT_W * 100, (308.64 + 85*.24/2) / FRONT_H * 100],
  },
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

      {/* Body diagram — fixed height container, image scales to fit */}
      <div className="flex justify-center items-start" style={{ height: "520px" }}>
        {/* inner wrapper matches actual image dimensions so % dots stay accurate */}
        <div className="relative select-none h-full" style={{ width: view === "front" ? "calc(520px * 151.92 / 352.32)" : "calc(520px * 209.04 / 352.08)" }}>
          <img
            src={view === "front" ? FRONT_SVG : BACK_SVG}
            alt={`${view} body diagram`}
            className="w-full h-full block"
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