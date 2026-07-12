import React, { useEffect, useState } from "react";

/**
 * Shows a tap ripple + finger pointer centered on a target element.
 * When `targetRef` is set and `active` is true, renders an animated
 * expanding circle + a 👆 pointer at the element's center.
 */
export default function TapIndicator({ targetRef, active }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!active || !targetRef?.current) {
      setPos(null);
      return;
    }
    const update = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        w: rect.width,
        h: rect.height,
      });
    };
    update();
    // Recompute on resize / scroll during the brief animation
    const interval = setInterval(update, 100);
    window.addEventListener("resize", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", update);
    };
  }, [active, targetRef]);

  if (!active || !pos) return null;

  return (
    <div
      className="fixed z-[120] pointer-events-none"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
    >
      <style>{`
        @keyframes tap-ripple {
          0%   { transform: scale(0.3); opacity: 0.8; }
          50%  { transform: scale(1.2); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes tap-finger-bounce {
          0%, 100% { transform: translate(-50%, -120%) scale(1); }
          50%      { transform: translate(-50%, -85%)  scale(0.9); }
        }
      `}</style>
      {/* Expanding ripple */}
      <div
        className="absolute rounded-full"
        style={{
          width: Math.max(pos.w, pos.h) * 1.2,
          height: Math.max(pos.w, pos.h) * 1.2,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(196, 181, 253, 0.35)",
          border: "2px solid #c4b5fd",
          animation: "tap-ripple 0.6s ease-out",
        }}
      />
      {/* Finger pointer */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          fontSize: "1.75rem",
          animation: "tap-finger-bounce 0.6s ease-in-out",
          filter: "drop-shadow(0 0 6px rgba(196, 181, 253, 0.7))",
        }}
      >
        👆
      </div>
    </div>
  );
}