"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartBarBig, ChartPie } from "lucide-react";
import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { DashboardData } from "@/types/dashboard";
import { t } from "@/lib/i18n";
import ChartTooltip, { useChartTooltip } from "./ChartTooltip";

// Same color for a category in both views; "Others" is grey in the donut
const COLORS = ["#0a8f4f", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6", "#6366f1", "#94a3b8"];
const OTHERS_COLOR = "#94a3b8";
const colorOf = (i: number) => (i < COLORS.length ? COLORS[i] : `${COLORS[i % COLORS.length]}99`);
// Donut: top 4 + "Others" so the legend keeps its size
const MAX_SLICES = 4;
const STATUS_COLORS = { ok: "bg-brand", warning: "bg-amber-500", exceeded: "bg-rose-500" };
const STATUS_TEXT = { ok: "text-brand-dark", warning: "text-amber-600", exceeded: "text-rose-600" };
const VIEW_KEY = "smartwallet.categoryChart";

type View = "donut" | "bars";
type Item = { label: string; value: number; percent: number; categoryId: number | null; color: string; rank: number };
type Slice = Item & { others: Item[] };

type Props = {
  categories: DashboardData["spending_by_category"];
  total: number;
  month: string;
  // Category budgets of the month, shown in the details
  budgets: DashboardData["budgets"]["categories"];
};

export default function CategoryDonut({ categories, total, month, budgets }: Props) {
  const { money, convert, symbol } = useCurrency();
  const router = useRouter();
  const tip = useChartTooltip<number>();
  const [view, setView] = useState<View>("donut");

  // Remember the chosen view in this browser
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "bars") setView("bars");
    } catch {
      // ignore
    }
  }, []);

  function changeView(next: View) {
    tip.hide();
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  }

  // Every category, biggest first (used by the bar view and inside "Others")
  const items: Item[] = categories.map((c, i) => ({
    label: t(c.category),
    value: c.total,
    percent: c.percent,
    categoryId: c.category_id,
    color: colorOf(i),
    rank: i + 1,
  }));

  // Donut: top 4, the rest grouped as "Others"
  const slices: Slice[] = items.slice(0, MAX_SLICES).map((item) => ({ ...item, others: [] }));
  const rest = items.slice(MAX_SLICES);
  if (rest.length > 0) {
    const value = rest.reduce((sum, c) => sum + c.value, 0);
    slices.push({
      label: t("Others"),
      value,
      percent: Math.round((value / total) * 1000) / 10,
      categoryId: null,
      color: OTHERS_COLOR,
      rank: 0,
      others: rest,
    });
  }

  const list: Slice[] = view === "donut" ? slices : items.map((item) => ({ ...item, others: [] }));
  const biggest = Math.max(...list.map((s) => s.percent), 1);
  const active = tip.active === null ? null : list[tip.active] ?? null;
  const activeBudget = active?.categoryId ? budgets.find((b) => b.category_id === active.categoryId) : undefined;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  // Shared hover / focus / click behaviour (slices, legend rows, bars)
  const handlers = (i: number) => ({
    onMouseEnter: (e: React.MouseEvent) => tip.follow(i, e),
    onMouseMove: (e: React.MouseEvent) => tip.follow(i, e),
    onMouseLeave: tip.hide,
    onFocus: (e: React.FocusEvent<HTMLElement | SVGElement>) => tip.anchor(i, e.currentTarget as HTMLElement),
    onBlur: tip.hide,
    onClick: () => {
      const item = list[i];
      if (item.categoryId) router.push(`/transactions?category=${item.categoryId}&month=${month}`);
    },
  });

  const viewButton = (value: View, Icon: typeof ChartPie, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={view === value}
      aria-label={label}
      title={label}
      onClick={() => changeView(value)}
      className={`flex h-7 w-8 items-center justify-center rounded-md transition ${view === value ? "bg-white text-brand-dark shadow-sm" : "text-muted hover:text-ink"}`}
    >
      <Icon size={15} />
    </button>
  );

  return (
    <Card
      title={t("Spending by category")}
      subtitle={slices[0] ? t("{name} is your top category", { name: slices[0].label }) : undefined}
      className="h-full"
      action={
        slices.length > 0 && (
          <div role="radiogroup" aria-label={t("Chart type")} className="flex rounded-lg bg-background p-0.5">
            {viewButton("donut", ChartPie, t("Donut chart"))}
            {viewButton("bars", ChartBarBig, t("Bar chart"))}
          </div>
        )
      }
    >
      {slices.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted">{t("No expenses this month.")}</p>
      ) : (
        <div ref={tip.containerRef} className="@container relative my-auto">
          {view === "donut" ? (
            // Container query: donut beside the legend when there is room, above it otherwise
            <div className="flex flex-col items-center gap-4 @[20rem]:flex-row @[20rem]:items-center">
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 overflow-visible">
                  {slices.map((slice, i) => {
                    const length = Math.max((slice.value / total) * circumference - gap, 0.5);
                    const isActive = tip.active === i;
                    const circle = (
                      <circle
                        key={slice.label}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={isActive ? 15 : 11}
                        strokeLinecap="round"
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-offset}
                        tabIndex={0}
                        role="button"
                        aria-label={`${slice.label}: ${money(slice.value)}, ${Math.round(slice.percent)}%`}
                        className={`cursor-pointer outline-none transition-all duration-200 ${tip.active !== null && !isActive ? "opacity-30" : ""}`}
                        {...handlers(i)}
                      />
                    );
                    offset += (slice.value / total) * circumference;
                    return circle;
                  })}
                </svg>
                {/* Centre: total, or the hovered slice */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                  {active ? (
                    <>
                      <span className="w-full truncate text-[10px] font-semibold" style={{ color: active.color }}>
                        {active.label}
                      </span>
                      <span className="text-base font-bold leading-tight text-ink">{Math.round(active.percent)}%</span>
                      <span className="text-[10px] text-muted">{t("of spending")}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-muted">{t("Spent")}</span>
                      <span className="text-sm font-bold leading-tight text-ink">{Math.round(convert(total)).toLocaleString("en-US")}</span>
                      <span className="text-[10px] text-muted">{symbol}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend with a small bar per category, scaled to the biggest one */}
              <ul className="w-full min-w-0 flex-1 space-y-0.5">
                {slices.map((slice, i) => (
                  <li key={slice.label}>
                    <button
                      type="button"
                      {...handlers(i)}
                      className={`w-full cursor-pointer rounded-lg px-1.5 py-[3px] text-start transition ${
                        tip.active === i ? "bg-background" : tip.active !== null ? "opacity-50" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slice.color }} />
                        <span className="min-w-0 flex-1 truncate text-ink">
                          {slice.label}
                          {slice.others.length > 0 && <span className="ms-1 text-[10px] text-muted">({slice.others.length})</span>}
                        </span>
                        <span className="shrink-0 font-semibold text-ink">{money(slice.value)}</span>
                        <span className="w-8 shrink-0 text-end text-[11px] text-muted">{Math.round(slice.percent)}%</span>
                      </span>
                      <span className="ms-4 mt-0.5 block h-1 overflow-hidden rounded-full bg-slate-100">
                        <span className="fill-in block h-full rounded-full" style={{ width: `${(slice.percent / biggest) * 100}%`, background: slice.color }} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            // Horizontal bars: every category, full names, easy to compare (scrolls when there are many)
            <ul className="thin-scroll -me-1 max-h-[12.5rem] space-y-1.5 overflow-y-auto pe-1" aria-label={t("Bar chart")}>
              {items.map((item, i) => (
                <li key={item.categoryId ?? item.label}>
                  <button
                    type="button"
                    {...handlers(i)}
                    className={`w-full cursor-pointer rounded-lg px-1.5 py-1 text-start transition hover:bg-background ${
                      tip.active === i ? "bg-background" : tip.active !== null ? "opacity-50" : ""
                    }`}
                  >
                    <span className="flex items-baseline gap-2 text-xs">
                      <span className="min-w-0 flex-1 break-words text-ink">{item.label}</span>
                      <span className="shrink-0 font-semibold text-ink">{money(item.value)}</span>
                      <span className="w-8 shrink-0 text-end text-[11px] text-muted">{Math.round(item.percent)}%</span>
                    </span>
                    <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="fill-in block h-full rounded-full"
                        style={{ width: `${Math.max((item.percent / biggest) * 100, 2)}%`, background: item.color }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Details of the hovered category (or of the categories inside "Others") */}
          <ChartTooltip position={tip.position}>
            {active && (
              <>
                <p className="flex items-center gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: active.color }} />
                  {active.label}
                  {active.rank > 0 && <span className="ms-auto text-[10px] font-normal text-muted">#{active.rank}</span>}
                </p>
                <p className="mt-1 text-base font-bold" dir="ltr">
                  {money(active.value)}
                </p>
                <p className="text-[11px] text-muted">{t("{percent}% of your spending this month", { percent: Math.round(active.percent) })}</p>

                {active.others.length > 0 ? (
                  // "Others": each category it contains
                  <ul className="mt-2 space-y-1 rounded-lg bg-background p-2">
                    {active.others.map((other) => (
                      <li key={other.label} className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: other.color }} />
                        <span className="min-w-0 flex-1 truncate">{other.label}</span>
                        <span className="shrink-0 font-semibold" dir="ltr">
                          {money(other.value)}
                        </span>
                        <span className="w-7 shrink-0 text-end text-muted">{Math.round(other.percent)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : activeBudget ? (
                  <div className="mt-2 rounded-lg bg-background p-2">
                    <p className="flex justify-between text-[11px]">
                      <span className="text-muted">{t("Budget")}</span>
                      <span className={`font-semibold ${STATUS_TEXT[activeBudget.status]}`}>{Math.round(activeBudget.percent_used)}%</span>
                    </p>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <span className={`block h-full rounded-full ${STATUS_COLORS[activeBudget.status]}`} style={{ width: `${Math.min(activeBudget.percent_used, 100)}%` }} />
                    </span>
                    <p className="mt-1 text-[10px] text-muted">
                      {activeBudget.remaining >= 0
                        ? t("{amount} left", { amount: money(activeBudget.remaining) })
                        : t("{amount} over", { amount: money(-activeBudget.remaining) })}{" "}
                      · {t("{amount} limit", { amount: money(activeBudget.amount_limit) })}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-muted">{t("No budget for this category.")}</p>
                )}
                <p className="mt-2 text-[10px] font-semibold text-brand-dark">
                  {active.others.length > 0 ? t("Switch to the bar chart to see every category") : t("Click to see the transactions")}
                </p>
              </>
            )}
          </ChartTooltip>
        </div>
      )}
    </Card>
  );
}
