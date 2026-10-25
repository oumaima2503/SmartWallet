"use client";

import { ReactNode, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// Tilts the app preview a little toward the mouse (desktop only)
export default function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (event: React.MouseEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    element.style.setProperty("--ry", `${x * 8}deg`);
    element.style.setProperty("--rx", `${-y * 8}deg`);
  };

  const reset = () => {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  };

  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={reset} className={`tilt ${className}`}>
      {children}
    </div>
  );
}
