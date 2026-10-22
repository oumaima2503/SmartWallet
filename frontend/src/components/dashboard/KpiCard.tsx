import { LucideIcon } from "lucide-react";
import Sparkline from "@/components/ui/Sparkline";

const TONES = {
  blue: { icon: "bg-sky-50 text-sky-600", line: "#0284c7" },
  red: { icon: "bg-rose-50 text-rose-500", line: "#f43f5e" },
  violet: { icon: "bg-violet-50 text-violet-600", line: "#7c3aed" },
};

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  // Change vs last month in %, null when there is nothing to compare
  change?: number | null;
  // For expenses a decrease is the good direction
  lowerIsBetter?: boolean;
  trend?: number[];
  footer?: string;
};

// Compact number card: value, change chip and a 6-month trend line
export default function KpiCard({ label, value, icon: Icon, tone, change = null, lowerIsBetter = false, trend, footer }: Props) {
  const good = change !== null && (lowerIsBetter ? change <= 0 : change >= 0);

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONES[tone].icon}`}>
            <Icon size={16} />
          </span>
          <span className="truncate text-xs font-medium text-muted">{label}</span>
        </span>
        {change !== null && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              good ? "bg-brand-soft text-brand-dark" : "bg-rose-50 text-rose-600"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="min-w-0 truncate text-xl font-bold tracking-tight text-ink">{value}</p>
        {trend && <Sparkline values={trend} color={TONES[tone].line} className="hidden h-8 w-20 shrink-0 sm:block" />}
      </div>
      {footer && <p className="mt-1 truncate text-[11px] text-muted">{footer}</p>}
    </div>
  );
}
