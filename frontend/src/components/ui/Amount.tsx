"use client";

import { useCurrency } from "@/lib/currency";
import { useCountUp } from "@/lib/motion";

type Size = "hero" | "card" | "list";

const SIZES: Record<Size, string> = {
  hero: "text-[28px] leading-none",
  card: "text-lg leading-tight",
  list: "text-sm",
};

type Props = {
  // Amount in MAD (converted to the chosen currency)
  value: number;
  size?: Size;
  // Show "+" / "-" in front (for income / expenses)
  sign?: "+" | "-" | "auto";
  className?: string;
};

// One way to show money everywhere: big whole part, small light decimals and currency
// e.g. 5,095 .00 MAD
export default function Amount({ value, size = "card", sign, className = "" }: Props) {
  const { parts } = useCurrency();
  // Big numbers count up; list amounts stay still (too many of them)
  const animated = useCountUp(value);
  const { negative, whole, decimals, symbol } = parts(size === "list" ? value : animated);
  const prefix = sign === "auto" ? (negative ? "-" : "") : sign ?? (negative ? "-" : "");

  return (
    // dir="ltr": the number keeps its order (5,095 .00 MAD) in Arabic too
    <span dir="ltr" className={`inline-flex items-baseline whitespace-nowrap font-display font-semibold tabular-nums ${SIZES[size]} ${className}`}>
      {prefix}
      {whole}
      <span className="text-[0.62em] font-medium opacity-60">{decimals}</span>
      <span className="ms-1 text-[0.55em] font-medium opacity-70">{symbol}</span>
    </span>
  );
}
