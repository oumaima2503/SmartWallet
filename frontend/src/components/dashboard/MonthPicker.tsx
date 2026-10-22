"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonthString, formatMonth } from "@/lib/format";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const OLDEST_YEAR = 2020;

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toMonth(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

type Props = { value: string; onChange: (month: string) => void };

// Month selector: arrows for quick steps, and a calendar popup to jump to any year / month
export default function MonthPicker({ value, onChange }: Props) {
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

  const arrow =
    "flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-background hover:text-ink disabled:pointer-events-none disabled:opacity-30";

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <div className="flex w-full items-center justify-between gap-0.5 rounded-2xl border border-line bg-white p-1 shadow-sm">
        <button className={arrow} onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-10 min-w-[10.5rem] items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink transition hover:bg-background"
        >
          <CalendarDays size={16} className="text-brand" />
          {formatMonth(value)}
          <ChevronDown size={15} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
        <button
          className={arrow}
          onClick={() => onChange(shiftMonth(value, 1))}
          disabled={value >= current}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a month"
          className="absolute inset-x-0 z-30 mt-2 rounded-2xl sm:left-auto sm:w-[18rem] border border-line bg-white p-4 shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between">
            <button
              className={arrow}
              onClick={() => setYear(year - 1)}
              disabled={year <= OLDEST_YEAR}
              aria-label="Previous year"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-bold text-ink">{year}</span>
            <button
              className={arrow}
              onClick={() => setYear(year + 1)}
              disabled={year >= currentYear}
              aria-label="Next year"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((name, index) => {
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
            This month
          </button>
        </div>
      )}
    </div>
  );
}
