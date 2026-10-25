"use client";

import { CalendarDays } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { formatMonth, todayString } from "@/lib/format";
import { Transaction } from "@/types/transactions";
import { currentLanguage, LANGUAGES, t } from "@/lib/i18n";

// Monday first: 5 Jan 2026 is a Monday
const weekdayLetter = (i: number) =>
  new Date(2026, 0, 5 + i).toLocaleDateString(LANGUAGES[currentLanguage()].locale, { weekday: "narrow" });
// From "no spending" to "a lot"
const LEVELS = ["bg-slate-100", "bg-brand/20", "bg-brand/40", "bg-brand/65", "bg-brand"];

type Props = { month: string; transactions: Transaction[] };

// Heatmap of the month: one square per day, darker = more spent that day
export default function SpendingCalendar({ month, transactions }: Props) {
  const { money } = useCurrency();
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  const firstWeekday = (new Date(year, m - 1, 1).getDay() + 6) % 7; // Monday = 0
  const today = todayString();

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
  const spendingDays = perDay.size;
  const noSpendDays = Math.max(pastDays - spendingDays, 0);
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <CalendarDays size={14} className="text-brand" />
          {t("Spending calendar")} · {formatMonth(month)}
        </p>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t("Spending per day")}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className="flex h-4 w-7 items-center justify-center text-[9px] font-semibold text-muted">
              {weekdayLetter(i)}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`empty-${i}`} className="h-7 w-7" />;
            const amount = perDay.get(day) ?? 0;
            const isToday = `${month}-${String(day).padStart(2, "0")}` === today;
            return (
              <span
                key={day}
                role="gridcell"
                title={`${day} ${formatMonth(month, true)}: ${amount > 0 ? money(amount) : t("no spending")}`}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-medium transition hover:ring-2 hover:ring-ink/20 ${
                  LEVELS[level(amount)]
                } ${level(amount) >= 3 ? "text-white" : "text-ink/50"} ${isToday ? "ring-2 ring-ink" : ""}`}
              >
                {day}
              </span>
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

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3">
        {[
          { label: t("Average per day"), value: pastDays > 0 ? money(total / pastDays) : "-" },
          { label: t("Days with spending"), value: `${spendingDays}` },
          { label: t("No-spend days"), value: `${noSpendDays}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-background/70 px-3 py-2">
            <p className="text-[10px] text-muted">{stat.label}</p>
            <p className="font-display text-sm font-semibold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
