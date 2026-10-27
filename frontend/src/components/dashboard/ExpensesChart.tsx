"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import { api, peekCache } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { currentMonthString, formatMonth } from "@/lib/format";
import { DashboardData } from "@/types/dashboard";
import { t } from "@/lib/i18n";
import ChartTooltip, { useChartTooltip } from "./ChartTooltip";

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

const WINDOW = 6;

// "2026-10" + -6 -> "2026-04"
function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const compact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export default function ExpensesChart({ trend, selectedMonth, onSelectMonth }: Props) {
  const { convert, money } = useCurrency();
  const tip = useChartTooltip<number>();

  // The 6 months shown: they end with the selected month, and the arrows move them 6 months back / forward
  const [windowEnd, setWindowEnd] = useState(selectedMonth);
  const [shown, setShown] = useState(trend);
  const [loading, setLoading] = useState(false);
  const latest = currentMonthString();

  // Another month selected (calendar, click) that is not visible: show the 6 months ending with it
  useEffect(() => {
    const visible = selectedMonth <= windowEnd && selectedMonth > shiftMonth(windowEnd, -WINDOW);
    if (!visible) setWindowEnd(selectedMonth);
    // windowEnd left out on purpose: browsing with the arrows must not jump back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Fresh dashboard data covers the 6 months ending with the selected month
  useEffect(() => {
    if (windowEnd === selectedMonth) setShown(trend);
  }, [trend, windowEnd, selectedMonth]);

  async function move(delta: number) {
    let end = shiftMonth(windowEnd, delta * WINDOW);
    if (end > latest) end = latest;
    if (end === windowEnd) return;
    tip.hide();
    setWindowEnd(end);
    const path = `/api/dashboard/trend?end=${end}`;
    const cached = peekCache<DashboardData["monthly_trend"]>(path);
    if (cached) return setShown(cached.data);
    setLoading(true);
    try {
      setShown(await api<DashboardData["monthly_trend"]>(path));
    } finally {
      setLoading(false);
    }
  }

  // Work in the display currency so the scale shows round numbers in that currency
  const rows = shown.map((row) => ({ ...row, income: convert(row.income), expenses: convert(row.expenses) }));
  const max = niceMax(Math.max(...rows.map((row) => Math.max(row.expenses, row.income))));

  // Notes on the chart: average spending of the months with data, and the highest month
  const withSpending = rows.filter((row) => row.expenses > 0);
  const average = withSpending.length > 1 ? withSpending.reduce((sum, row) => sum + row.expenses, 0) / withSpending.length : null;
  const highestIndex = withSpending.length > 1 ? rows.findIndex((row) => row.expenses === Math.max(...rows.map((r) => r.expenses))) : -1;

  const selected = trend.find((row) => row.month === selectedMonth);
  const kept = selected && selected.income > 0 ? Math.round(((selected.income - selected.expenses) / selected.income) * 100) : null;

  // "May – Oct 2026", or "Nov 2025 – Apr 2026" when the period crosses a year
  const first = shown[0]?.month ?? "";
  const last = shown[shown.length - 1]?.month ?? "";
  const period = shown.length
    ? `${formatMonth(first, true)}${first.slice(0, 4) !== last.slice(0, 4) ? ` ${first.slice(0, 4)}` : ""} – ${formatMonth(last, true)} ${last.slice(0, 4)}`
    : "";
  const arrow =
    "flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand-dark disabled:pointer-events-none disabled:opacity-35";

  return (
    <Card
      title={t("Income vs expenses")}
      subtitle={`${period} · ${t("tap a month")}`}
      className="h-full"
      action={
        <div className="flex items-center gap-1.5">
          {loading && <LoaderCircle size={14} className="animate-spin text-muted" />}
          <button onClick={() => move(-1)} aria-label={t("Previous 6 months")} title={t("Previous 6 months")} className={arrow}>
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => move(1)}
            disabled={windowEnd >= latest}
            aria-label={t("Next 6 months")}
            title={t("Next 6 months")}
            className={arrow}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      }
    >
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

        <div ref={tip.containerRef} className="relative min-w-0 flex-1">
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

            <div className={`relative flex h-full items-end gap-1 transition-opacity ${loading ? "opacity-40" : ""}`}>
              {rows.map((row, i) => {
                const isSelected = row.month === selectedMonth;
                const incomeHeight = (row.income / max) * 100;
                const expenseHeight = (row.expenses / max) * 100;
                return (
                  <button
                    key={row.month}
                    onClick={() => onSelectMonth(row.month)}
                    aria-pressed={isSelected}
                    aria-label={`${formatMonth(row.month)}: ${t("Income")} ${money(shown[i].income)}, ${t("Expenses")} ${money(shown[i].expenses)}`}
                    onMouseEnter={(e) => tip.follow(i, e)}
                    onMouseMove={(e) => tip.follow(i, e)}
                    onMouseLeave={tip.hide}
                    onFocus={(e) => tip.anchor(i, e.currentTarget)}
                    onBlur={tip.hide}
                    className={`group relative flex h-full flex-1 cursor-pointer items-end justify-center gap-[3px] rounded-lg transition ${
                      tip.active === i ? "bg-ink/[0.04]" : ""
                    }`}
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

          {/* Details of the hovered month */}
          <ChartTooltip position={tip.position}>
            {tip.active !== null && shown[tip.active] && <MonthDetails row={shown[tip.active]} average={average === null ? null : average} />}
          </ChartTooltip>

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

// Income, expenses, balance, share kept and comparison with the average month
function MonthDetails({ row, average }: { row: DashboardData["monthly_trend"][number]; average: number | null }) {
  const { money, convert } = useCurrency();
  const balance = row.income - row.expenses;
  const kept = row.income > 0 ? Math.round((balance / row.income) * 100) : null;
  // average is already in the display currency
  const vsAverage = average && row.expenses > 0 ? Math.round(((convert(row.expenses) - average) / average) * 100) : null;

  return (
    <>
      <p className="font-semibold capitalize">{formatMonth(row.month)}</p>
      <div className="mt-2 space-y-1">
        <p className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {t("Income")}
          </span>
          <span className="font-semibold text-brand-dark" dir="ltr">
            {money(row.income)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            {t("Expenses")}
          </span>
          <span className="font-semibold" dir="ltr">
            {money(row.expenses)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-2 border-t border-line pt-1">
          <span className="text-muted">{t("Balance")}</span>
          <span className={`font-bold ${balance < 0 ? "text-rose-600" : "text-ink"}`} dir="ltr">
            {balance < 0 ? "-" : "+"}
            {money(Math.abs(balance))}
          </span>
        </p>
      </div>
      {row.income === 0 && row.expenses === 0 ? (
        <p className="mt-2 text-[10px] text-muted">{t("Nothing recorded this month.")}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          {kept !== null && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${kept >= 0 ? "bg-violet-50 text-violet-700" : "bg-rose-50 text-rose-600"}`}>
              {t("Kept {percent}%", { percent: kept })}
            </span>
          )}
          {vsAverage !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                vsAverage > 10 ? "bg-rose-50 text-rose-600" : vsAverage < -10 ? "bg-brand-soft text-brand-dark" : "bg-amber-50 text-amber-700"
              }`}
            >
              {vsAverage === 0 ? t("Average spending") : t("{percent}% vs average", { percent: `${vsAverage > 0 ? "+" : ""}${vsAverage}` })}
            </span>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] font-semibold text-brand-dark">{t("Click to open this month")}</p>
    </>
  );
}
