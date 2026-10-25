"use client";

import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Counts from the previous value to the new one (ease-out), e.g. 0 -> 5,095 on first render
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const from = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const initial = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(initial + (target - initial) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const CONFETTI_COLORS = ["#0a8f4f", "#34d399", "#f59e0b", "#7c3aed", "#3b82f6", "#f43f5e"];

// Small confetti burst from the top of the screen (no library needed)
export function confetti(count = 90) {
  if (typeof document === "undefined" || prefersReducedMotion()) return;
  const layer = document.createElement("div");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `position:absolute;top:-12px;left:${50 + (Math.random() - 0.5) * 60}%;width:${size}px;height:${size * 0.45}px;background:${
      CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    };border-radius:2px`;
    layer.appendChild(piece);
    const drift = (Math.random() - 0.5) * 500;
    piece.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${drift}px, ${window.innerHeight * (0.7 + Math.random() * 0.4)}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 1200, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }
    );
  }
  setTimeout(() => layer.remove(), 3200);
}
