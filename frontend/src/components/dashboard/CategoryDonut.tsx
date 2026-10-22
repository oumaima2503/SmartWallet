"use client";

import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { DashboardData } from "@/types/dashboard";

const COLORS = ["#0a8f4f", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8"];
const MAX_SLICES = 5;

type Props = {
  categories: DashboardData["spending_by_category"];
  total: number;
};

export default function CategoryDonut({ categories, total }: Props) {
  const { money, convert, symbol } = useCurrency();

  // Top 5 categories, the rest grouped as "Others"
  const slices = categories.slice(0, MAX_SLICES).map((c) => ({ label: c.category, value: c.total, percent: c.percent }));
  const rest = categories.slice(MAX_SLICES);
  if (rest.length > 0) {
    const value = rest.reduce((sum, c) => sum + c.total, 0);
    slices.push({ label: "Others", value, percent: Math.round((value / total) * 1000) / 10 });
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 1.2 : 0;
  let offset = 0;

  return (
    <Card title="Spending by category" className="h-full">
      {slices.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted">No expenses this month.</p>
      ) : (
        // Container query: legend beside the donut when the card is wide enough, below it otherwise
        <div className="@container flex flex-1 items-center">
          <div className="flex w-full flex-col items-center gap-4 @sm:flex-row">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#eef2ef" strokeWidth="13" />
                {slices.map((slice, i) => {
                  const length = Math.max((slice.value / total) * circumference - gap, 0);
                  const circle = (
                    <circle
                      key={slice.label}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth="13"
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
                <span className="text-base font-bold text-ink">
                  {Math.round(convert(total)).toLocaleString("fr-FR")}
                </span>
                <span className="text-[10px] text-muted">{symbol}</span>
              </div>
            </div>

            <ul className="w-full min-w-0 flex-1 space-y-1.5 text-xs">
              {slices.map((slice, i) => (
                <li key={slice.label} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-ink">{slice.label}</span>
                  <span className="shrink-0 font-semibold text-ink">{money(slice.value)}</span>
                  <span className="w-10 shrink-0 text-right text-muted">{Math.round(slice.percent)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
