"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonthString, formatMonth, shortMonthName } from "@/lib/format";
import { t } from "@/lib/i18n";

const MONTH_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const OLDEST_YEAR = 2020;

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toMonth(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

// compact: a small version for tight headers
type Props = { value: string; onChange: (month: string) => void; compact?: boolean };

// Month selector: arrows for quick steps, and a calendar popup to jump to any year / month
export default function MonthPicker({ value, onChange, compact = false }: Props) {
  const current = currentMonthString();
  const currentYear = Number(current.slice(0, 4));
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setYear(Number(value.slice(0, 4)));
    setOpen(!open);
  }

  function select(month: string) {
    onChange(month);
    setOpen(false);
  }

  // Arrows of the year popup (always normal size)
  const arrow =
    "flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-background hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  // Arrows and label of the bar itself
  const navArrow = `flex items-center justify-center text-muted transition hover:bg-background hover:text-ink disabled:pointer-events-none disabled:opacity-30 ${
    compact ? "h-7 w-7 rounded-md" : "h-10 w-10 rounded-xl"
  }`;

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <div
        className={`flex w-full items-center justify-between gap-0.5 border border-line bg-white ${
          compact ? "rounded-xl p-0.5" : "rounded-2xl p-1 shadow-sm"
        }`}
      >
        <button className={navArrow} onClick={() => onChange(shiftMonth(value, -1))} aria-label={t("Previous month")}>
          <ChevronLeft size={compact ? 15 : 18} />
        </button>
        <button
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`flex items-center justify-center font-semibold text-ink transition hover:bg-background ${
            compact ? "h-7 min-w-[8.5rem] gap-1.5 rounded-md px-2 text-xs" : "h-10 min-w-[10.5rem] gap-2 rounded-xl px-3 text-sm"
          }`}
        >
          <CalendarDays size={compact ? 14 : 16} className="text-brand" />
          {formatMonth(value)}
          <ChevronDown size={compact ? 13 : 15} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
        <button
          className={navArrow}
          onClick={() => onChange(shiftMonth(value, 1))}
          disabled={value >= current}
          aria-label={t("Next month")}
        >
          <ChevronRight size={compact ? 15 : 18} />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label={t("Choose a month")}
          className="absolute inset-x-0 z-30 mt-2 rounded-2xl sm:start-auto sm:w-[18rem] border border-line bg-white p-4 shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between">
            <button
              className={arrow}
              onClick={() => setYear(year - 1)}
              disabled={year <= OLDEST_YEAR}
              aria-label={t("Previous year")}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-bold text-ink">{year}</span>
            <button
              className={arrow}
              onClick={() => setYear(year + 1)}
              disabled={year >= currentYear}
              aria-label={t("Next year")}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {MONTH_INDEXES.map((index) => {
              const name = shortMonthName(index);
              const month = toMonth(year, index);
              const isSelected = month === value;
              const isCurrent = month === current;
              const isFuture = month > current;
              return (
                <button
                  key={name}
                  onClick={() => select(month)}
                  disabled={isFuture}
                  aria-pressed={isSelected}
                  className={`relative h-11 rounded-xl text-sm font-medium transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                    isSelected
                      ? "bg-brand text-white shadow-sm shadow-brand/30"
                      : "text-ink hover:bg-brand-soft hover:text-brand-dark"
                  }`}
                >
                  {name}
                  {isCurrent && !isSelected && (
                    <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => select(current)}
            className="mt-3 w-full rounded-xl border border-line py-2 text-sm font-medium text-brand-dark transition hover:bg-brand-soft"
          >
            {t("This month")}
          </button>
        </div>
      )}
    </div>
  );
}
