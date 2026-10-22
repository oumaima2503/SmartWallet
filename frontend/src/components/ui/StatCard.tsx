import { LucideIcon } from "lucide-react";

type Tone = "green" | "blue" | "red" | "amber";

const TONES: Record<Tone, string> = {
  green: "bg-brand-soft text-brand",
  blue: "bg-sky-50 text-sky-600",
  red: "bg-rose-50 text-rose-500",
  amber: "bg-amber-50 text-amber-600",
};

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  // e.g. "+8%" shown as a chip in the corner
  badge?: { text: string; positive: boolean } | null;
  hint?: string;
};

export default function StatCard({ label, value, icon: Icon, tone = "green", badge, hint }: Props) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-between gap-3 rounded-3xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)] sm:gap-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${TONES[tone]}`}>
          <Icon size={20} />
        </span>
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${
              badge.positive ? "bg-brand-soft text-brand-dark" : "bg-rose-50 text-rose-600"
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
