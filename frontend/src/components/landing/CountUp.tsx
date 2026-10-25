"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/lib/motion";

// Counts from 0 to the value once the page has loaded (used in the landing preview)
export default function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [target, setTarget] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setTarget(value), 400);
    return () => clearTimeout(timer);
  }, [value]);
  const current = useCountUp(target, 1400);
  return <>{current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
