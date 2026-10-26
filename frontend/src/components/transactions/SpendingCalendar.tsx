"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MousePointerClick, PartyPopper, X } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { formatMonth, todayString } from "@/lib/format";
import { categoryIcon } from "@/lib/categoryIcons";
import { Transaction } from "@/types/transactions";
import { currentLanguage, LANGUAGES, t } from "@/lib/i18n";

// Monday first: 5 Jan 2026 is a Monday
const weekdayLetter = (i: number) =>
  new Date(2026, 0, 5 + i).toLocaleDateString(LANGUAGES[currentLanguage()].locale, { weekday: "narrow" });
// From "no spending" to "a lot"
const LEVELS = ["bg-slate-100", "bg-brand/20", "bg-brand/40", "bg-brand/65", "bg-brand"];

type Props = { month: string; transactions: Transaction[] };

// Heatmap of the month: one square per day, darker = more spent that day.
// Clicking a day shows what was spent (and earned) that day.
export default function SpendingCalendar({ month, transactions }: Props) {
  const { money } = useCurrency();
  const [selected, setSelected] = useState<number | null>(null);
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  const firstWeekday = (new Date(year, m - 1, 1).getDay() + 6) % 7; // Monday = 0
  const today = todayString();
  const dateOf = (day: number) => `${month}-${String(day).padStart(2, "0")}`;

  // Another month or other filters: close the details
  useEffect(() => setSelected(null), [month]);

  const perDay = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.date.startsWith(month)) continue;
    const day = Number(tx.date.slice(8, 10));
    perDay.set(day, (perDay.get(day) ?? 0) + Number(tx.amount));
  }

  const max = Math.max(...perDay.values(), 0);
  const level = (amount: number) => (amount <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((amount / max) * 4)));

  // Only count days that already happened
  const pastDays = month < today.slice(0, 7) ? daysInMonth : month === today.slice(0, 7) ? Number(today.slice(8, 10)) : 0;
  const total = [...perDay.values()].reduce((sum, v) => sum + v, 0);
  const average = pastDays > 0 ? total / pastDays : 0;
  const spendingDays = perDay.size;
  const noSpendDays = Math.max(pastDays - spendingDays, 0);
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-start">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <CalendarDays size={14} className="text-brand" />
          {t("Spending calendar")} · {formatMonth(month)}
        </p>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t("Spending per day")}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className="flex h-4 w-8 items-center justify-center text-[9px] font-semibold text-muted">
              {weekdayLetter(i)}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`empty-${i}`} className="h-8 w-8" />;
            const amount = perDay.get(day) ?? 0;
            const date = dateOf(day);
            const isToday = date === today;
            const isFuture = date > today;
            const isSelected = selected === day;
            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                disabled={isFuture}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : day)}
                title={
                  isFuture
                    ? undefined
                    : `${day} ${formatMonth(month, true)}: ${amount > 0 ? money(amount) : t("no spending")} · ${t("Click to see the details")}`
                }
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-medium transition duration-150 ${
                  LEVELS[level(amount)]
                } ${level(amount) >= 3 ? "text-white" : "text-ink/60"} ${
                  isFuture
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:z-10 hover:scale-115 hover:shadow-md hover:ring-2 hover:ring-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                } ${isSelected ? "z-10 scale-110 shadow-md ring-2 ring-brand ring-offset-1 ring-offset-white" : isToday ? "ring-2 ring-ink" : ""}`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[9px] text-muted">
          {t("Less")}
          {LEVELS.map((color) => (
            <span key={color} className={`h-2.5 w-2.5 rounded-sm ${color}`} />
          ))}
          {t("More")}
        </div>
        
      </div>

      {selected === null ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3 sm:self-center">
          {[
            { label: t("Average per day"), value: pastDays > 0 ? money(average) : "-" },
            { label: t("Days with spending"), value: `${spendingDays}` },
            { label: t("No-spend days"), value: `${noSpendDays}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-background/70 px-3 py-2">
              <p className="text-[10px] text-muted">{stat.label}</p>
              <p className="font-display text-sm font-semibold text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <DayDetails
          date={dateOf(selected)}
          transactions={transactions.filter((tx) => tx.date.startsWith(dateOf(selected)))}
          spent={perDay.get(selected) ?? 0}
          monthTotal={total}
          average={average}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

type DayProps = {
  date: string;
  transactions: Transaction[];
  spent: number;
  monthTotal: number;
  average: number;
  onClose: () => void;
};

// What happened on one day: total, comparison with a normal day, and the list
function DayDetails({ date, transactions, spent, monthTotal, average, onClose }: DayProps) {
  const { money } = useCurrency();
  const label = new Date(`${date}T00:00:00`).toLocaleDateString(LANGUAGES[currentLanguage()].locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const income = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount), 0);
  const share = monthTotal > 0 ? Math.round((spent / monthTotal) * 100) : 0;
  const ratio = average > 0 ? spent / average : 0;

  // Close with Escape
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="rise min-w-0 rounded-2xl border border-line bg-background/60 p-3" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold capitalize text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-muted">
            {spent > 0 ? (
              <>
                <span className="font-semibold text-rose-600" dir="ltr">
                  -{money(spent)}
                </span>{" "}
                · {t("{percent}% of the month's spending", { percent: share })}
              </>
            ) : (
              t("No spending on this day")
            )}
            {income > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-brand-dark" dir="ltr">
                  +{money(income)}
                </span>
              </>
            )}
          </p>
        </div>
        <button onClick={onClose} aria-label={t("Close")} className="rounded-lg p-1 text-muted transition hover:bg-white hover:text-ink">
          <X size={15} />
        </button>
      </div>

      {spent > 0 && average > 0 && (
        <p
          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            ratio >= 1.5 ? "bg-rose-50 text-rose-600" : ratio <= 0.75 ? "bg-brand-soft text-brand-dark" : "bg-amber-50 text-amber-700"
          }`}
        >
          {ratio >= 1.5
            ? t("{times}× your daily average", { times: ratio.toFixed(1) })
            : ratio <= 0.75
              ? t("Below your daily average")
              : t("Close to your daily average")}
        </p>
      )}

      {transactions.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-xs text-brand-dark">
          <PartyPopper size={15} />
          {t("A no-spend day. Well done!")}
        </div>
      ) : (
        <ul className="thin-scroll mt-3 max-h-48 space-y-1.5 overflow-y-auto">
          {transactions.map((tx) => {
            const Icon = categoryIcon(tx.category_name);
            const isIncome = tx.type === "income";
            return (
              <li key={tx.id} className="flex items-center gap-2.5 rounded-xl bg-white px-2.5 py-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isIncome ? "bg-brand-soft text-brand" : "bg-rose-50 text-rose-500"
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">{tx.merchant || tx.description || t(tx.category_name)}</span>
                  <span className="block truncate text-[10px] text-muted">
                    {t(tx.category_name)}
                    {tx.merchant && tx.description ? ` · ${tx.description}` : ""}
                  </span>
                </span>
                <span dir="ltr" className={`shrink-0 text-xs font-semibold ${isIncome ? "text-brand-dark" : "text-ink"}`}>
                  {isIncome ? "+" : "-"}
                  {money(Number(tx.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
