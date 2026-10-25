"use client";

import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { formatMonth } from "@/lib/format";
import { DashboardData } from "@/types/dashboard";
import { t } from "@/lib/i18n";

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

const compact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export default function ExpensesChart({ trend, selectedMonth, onSelectMonth }: Props) {
  const { convert, money } = useCurrency();
  // Work in the display currency so the scale shows round numbers in that currency
  const rows = trend.map((row) => ({ ...row, income: convert(row.income), expenses: convert(row.expenses) }));
  const max = niceMax(Math.max(...rows.map((row) => Math.max(row.expenses, row.income))));

  // Notes on the chart: average spending of the months with data, and the highest month
  const withSpending = rows.filter((row) => row.expenses > 0);
  const average = withSpending.length > 1 ? withSpending.reduce((sum, row) => sum + row.expenses, 0) / withSpending.length : null;
  const highestIndex = withSpending.length > 1 ? rows.findIndex((row) => row.expenses === Math.max(...rows.map((r) => r.expenses))) : -1;

  const selected = trend.find((row) => row.month === selectedMonth);
  const kept = selected && selected.income > 0 ? Math.round(((selected.income - selected.expenses) / selected.income) * 100) : null;

  return (
    <Card title={t("Income vs expenses")} subtitle={t("Last 6 months · tap a month")} className="h-full">
      {/* Selected month in numbers */}
      {selected && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-brand-soft/70 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {t("Income")}
            </p>
            <p className="truncate text-sm font-bold text-ink">{money(selected.income)}</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-ink/70">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" /> {t("Expenses")}
            </p>
            <p className="truncate text-sm font-bold text-ink">{money(selected.expenses)}</p>
          </div>
          <div className="rounded-xl bg-violet-50 px-3 py-2">
            <p className="text-[10px] font-medium text-violet-700">{t("Kept")}</p>
            <p className="truncate text-sm font-bold text-ink">{kept === null ? "-" : `${kept}%`}</p>
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-2">
        {/* Scale: same height as the bar area */}
        <div className="flex h-28 w-8 shrink-0 flex-col justify-between text-end text-[10px] text-muted">
          <span className="-translate-y-1.5">{compact(max)}</span>
          <span>{compact(max / 2)}</span>
          <span className="translate-y-1.5">0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-28">
            {/* Guide lines exactly on top / middle / bottom of the bars */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-px ${i === 2 ? "bg-line" : "border-t border-dashed border-line"}`} />
              ))}
            </div>

            {average !== null && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-rose-400/70"
                style={{ bottom: `${(average / max) * 100}%` }}
              >
                <span className="absolute -top-2 end-0 rounded bg-white px-1 text-[9px] font-semibold text-rose-500">
                  {t("avg")} {compact(average)}
                </span>
              </div>
            )}

            <div className="relative flex h-full items-end gap-1">
              {rows.map((row, i) => {
                const isSelected = row.month === selectedMonth;
                const incomeHeight = (row.income / max) * 100;
                const expenseHeight = (row.expenses / max) * 100;
                return (
                  <button
                    key={row.month}
                    onClick={() => onSelectMonth(row.month)}
                    aria-pressed={isSelected}
                    aria-label={`${formatMonth(row.month)}: ${t("Income")} ${money(trend[i].income)}, ${t("Expenses")} ${money(trend[i].expenses)}`}
                    title={`${formatMonth(row.month)} · ${t("Income")} ${money(trend[i].income)} · ${t("Expenses")} ${money(trend[i].expenses)}`}
                    className="group relative flex h-full flex-1 items-end justify-center gap-[3px]"
                  >
                    {i === highestIndex && (
                      <span
                        className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-1.5 py-px text-[8px] font-semibold text-white"
                        style={{ bottom: `calc(${Math.max(expenseHeight, incomeHeight)}% + 4px)` }}
                      >
                        {t("Highest")}
                      </span>
                    )}
                    <span
                      className={`w-2.5 rounded-full transition-all sm:w-3 ${isSelected ? "bg-brand" : "bg-brand/30 group-hover:bg-brand/50"}`}
                      style={{ height: `${Math.max(incomeHeight, row.income > 0 ? 3 : 0)}%` }}
                    />
                    <span
                      className={`w-2.5 rounded-full transition-all sm:w-3 ${isSelected ? "bg-ink" : "bg-ink/25 group-hover:bg-ink/45"}`}
                      style={{ height: `${Math.max(expenseHeight, row.expenses > 0 ? 3 : 0)}%` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month labels, the selected one as a pill */}
          <div className="mt-2 flex gap-1">
            {rows.map((row) => {
              const isSelected = row.month === selectedMonth;
              return (
                <button
                  key={row.month}
                  onClick={() => onSelectMonth(row.month)}
                  tabIndex={-1}
                  className={`flex-1 rounded-full py-0.5 text-[11px] transition ${
                    isSelected ? "bg-ink font-semibold text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {formatMonth(row.month, true)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
