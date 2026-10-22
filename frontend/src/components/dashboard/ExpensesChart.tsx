"use client";

import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { formatMonth } from "@/lib/format";
import { DashboardData } from "@/types/dashboard";

type Props = {
  trend: DashboardData["monthly_trend"];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
};

// Rounds the top of the chart to a readable number
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

export default function ExpensesChart({ trend, selectedMonth, onSelectMonth }: Props) {
  const { convert, money } = useCurrency();
  // Work in the display currency so the scale shows round numbers in that currency
  const rows = trend.map((row) => ({ ...row, income: convert(row.income), expenses: convert(row.expenses) }));
  const max = niceMax(Math.max(...rows.map((row) => Math.max(row.expenses, row.income))));
  const compact = (value: number) => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return (
    <Card
      title="Income vs expenses"
      subtitle="Last 6 months · click a month to open it"
      className="h-full"
      action={
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-brand/35" /> Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ink" /> Expenses
          </span>
        </div>
      }
    >
      <div className="flex flex-1 flex-col justify-end">
        <div className="relative h-48">
          {/* Grid lines with values; bottom-6 = height of the month labels */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {[1, 0.5, 0].map((line) => (
              <div key={line} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-right text-[10px] text-muted">{compact(max * line)}</span>
                <div className="h-px flex-1 border-t border-dashed border-line" />
              </div>
            ))}
          </div>

          <div className="relative ml-11 flex h-full items-end gap-1">
            {rows.map((row, i) => {
              const isSelected = row.month === selectedMonth;
              return (
                <button
                  key={row.month}
                  onClick={() => onSelectMonth(row.month)}
                  aria-pressed={isSelected}
                  aria-label={`${formatMonth(row.month)}: income ${money(trend[i].income)}, expenses ${money(trend[i].expenses)}`}
                  title={`${formatMonth(row.month)} · income ${money(trend[i].income)} · expenses ${money(trend[i].expenses)}`}
                  className={`group flex h-full flex-1 flex-col items-center justify-end gap-1.5 rounded-lg transition ${
                    isSelected ? "bg-brand-soft/70" : "hover:bg-background"
                  }`}
                >
                  <div className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center gap-1 px-1">
                    <div
                      className="w-full max-w-3.5 rounded-t-md bg-brand/35 transition group-hover:bg-brand/50"
                      style={{ height: `${Math.max((row.income / max) * 100, row.income > 0 ? 2 : 0)}%` }}
                    />
                    <div
                      className={`w-full max-w-3.5 rounded-t-md transition ${isSelected ? "bg-ink" : "bg-ink/65 group-hover:bg-ink"}`}
                      style={{ height: `${Math.max((row.expenses / max) * 100, row.expenses > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className={`h-4.5 text-[11px] ${isSelected ? "font-semibold text-ink" : "text-muted"}`}>
                    {formatMonth(row.month, true)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
