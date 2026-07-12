import React, { useEffect, useState } from "react";

/**
 * Shows a 👆 finger pointer centered directly on a target element.
 * When `targetRef` is set and `active` is true, renders a steady
 * finger pointer at the element's center with a gentle fade-in.
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
      });
    };
    update();
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
        @keyframes tap-finger-fade {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div
        className="absolute"
        style={{
          fontSize: "1.75rem",
          animation: "tap-finger-fade 0.9s ease-in-out",
          filter: "drop-shadow(0 0 6px rgba(196, 181, 253, 0.7))",
        }}
      >
        👆
      </div>
    </div>
  );
}