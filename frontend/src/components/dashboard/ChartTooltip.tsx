"use client";

import { ReactNode, useCallback, useRef, useState } from "react";

type Position = { x: number; y: number; width: number };

// Tracks where the floating detail card should be, relative to a chart container.
// Mouse: follows the pointer. Keyboard focus / tap: sits above the element.
export function useChartTooltip<T>() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<T | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const follow = useCallback((item: T, event: React.MouseEvent) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    setActive(item);
    setPosition({ x: event.clientX - box.left, y: event.clientY - box.top, width: box.width });
  }, []);

  const anchor = useCallback((item: T, element: HTMLElement) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const target = element.getBoundingClientRect();
    setActive(item);
    setPosition({ x: target.left + target.width / 2 - box.left, y: target.top - box.top, width: box.width });
  }, []);

  const hide = useCallback(() => {
    setActive(null);
    setPosition(null);
  }, []);

  return { containerRef, active, position, follow, anchor, hide };
}

const WIDTH = 220;

// The card itself: above the pointer, kept inside the chart horizontally
export default function ChartTooltip({ position, children }: { position: Position | null; children: ReactNode }) {
  if (!position) return null;
  const width = Math.min(WIDTH, position.width - 8);
  const left = Math.min(Math.max(position.x - width / 2, 4), position.width - width - 4);
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 rounded-2xl border border-line bg-white p-3 text-xs text-ink shadow-xl shadow-slate-900/15"
      style={{ left, top: position.y, width, transform: "translateY(calc(-100% - 12px))" }}
    >
      {children}
    </div>
  );
}
