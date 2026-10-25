"use client";

import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { DashboardData } from "@/types/dashboard";
import { t } from "@/lib/i18n";

const COLORS = ["#0a8f4f", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8"];
const MAX_SLICES = 5;

type Props = {
  categories: DashboardData["spending_by_category"];
  total: number;
};

export default function CategoryDonut({ categories, total }: Props) {
  const { money, convert, symbol } = useCurrency();

  // Top 5 categories, the rest grouped as "Others"
  const slices = categories.slice(0, MAX_SLICES).map((c) => ({ label: t(c.category), value: c.total, percent: c.percent }));
  const rest = categories.slice(MAX_SLICES);
  if (rest.length > 0) {
    const value = rest.reduce((sum, c) => sum + c.total, 0);
    slices.push({ label: t("Others"), value, percent: Math.round((value / total) * 1000) / 10 });
  }
  const biggest = Math.max(...slices.map((s) => s.percent), 1);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <Card
      title={t("Spending by category")}
      subtitle={slices[0] ? t("{name} is your top category", { name: slices[0].label }) : undefined}
      className="h-full"
    >
      {slices.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted">{t("No expenses this month.")}</p>
      ) : (
        // Container query: donut beside the legend when there is room, above it otherwise
        <div className="@container mt-auto">
          <div className="flex flex-col items-center gap-4 @[20rem]:flex-row @[20rem]:items-center">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                {slices.map((slice, i) => {
                  const length = Math.max((slice.value / total) * circumference - gap, 0.5);
                  const circle = (
                    <circle
                      key={slice.label}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-offset}
                    >
                      <title>{`${slice.label}: ${money(slice.value)}`}</title>
                    </circle>
                  );
                  offset += (slice.value / total) * circumference;
                  return circle;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted">{t("Spent")}</span>
                <span className="text-sm font-bold leading-tight text-ink">
                  {Math.round(convert(total)).toLocaleString("en-US")}
                </span>
                <span className="text-[10px] text-muted">{symbol}</span>
              </div>
            </div>

            {/* Legend with a small bar per category, scaled to the biggest one */}
            <ul className="w-full min-w-0 flex-1 space-y-2">
              {slices.map((slice, i) => (
                <li key={slice.label}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate text-ink">{slice.label}</span>
                    <span className="shrink-0 font-semibold text-ink">{money(slice.value)}</span>
                    <span className="w-8 shrink-0 text-end text-[11px] text-muted">{Math.round(slice.percent)}%</span>
                  </div>
                  <div className="ms-4 mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="fill-in h-full rounded-full"
                      style={{ width: `${(slice.percent / biggest) * 100}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
