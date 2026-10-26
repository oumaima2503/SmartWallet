"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, ChevronDown, X } from "lucide-react";
import { formatDate, todayString } from "@/lib/format";
import { t } from "@/lib/i18n";

export type DateRange = { start: string; end: string };

function shiftDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function rangeLabel(range: DateRange) {
  return range.start === range.end ? formatDate(range.start) : `${formatDate(range.start)} – ${formatDate(range.end)}`;
}

type Props = { value: DateRange | null; onChange: (range: DateRange | null) => void };

// "Dates" button with quick choices and a custom From / To range
export default function DateFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value?.start ?? "");
  const [end, setEnd] = useState(value?.end ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const today = todayString();

  // Closes on outside click or Escape
  useEffect(() => {
    if (!open) return;
    setStart(value?.start ?? "");
    setEnd(value?.end ?? "");
    const onClick = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, value]);

  const presets: { label: string; range: DateRange }[] = [
    { label: "Today", range: { start: today, end: today } },
    { label: "Yesterday", range: { start: shiftDays(today, -1), end: shiftDays(today, -1) } },
    { label: "Last 7 days", range: { start: shiftDays(today, -6), end: today } },
    { label: "Last 30 days", range: { start: shiftDays(today, -29), end: today } },
  ];

  function choose(range: DateRange | null) {
    onChange(range);
    setOpen(false);
  }

  const invalid = !!start && !!end && end < start;
  const input =
    "h-10 w-full rounded-xl border border-line bg-white px-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

  return (
    <div ref={ref} className="relative">
      <div className="flex h-9 items-stretch">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`flex items-center gap-2 border px-3 text-sm font-medium transition ${value ? "rounded-s-xl border-ink bg-ink text-white" : "rounded-xl border-line bg-white text-muted hover:text-ink"}`}
        >
          <CalendarRange size={16} />
          <span className="max-w-[12rem] truncate">{value ? rangeLabel(value) : t("Dates")}</span>
          {!value && <ChevronDown size={14} />}
        </button>
        {value && (
          <button
            onClick={() => onChange(null)}
            aria-label={t("Remove the date filter")}
            className="flex items-center rounded-e-xl border border-s-0 border-ink bg-ink px-2 text-white/80 transition hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="rise absolute end-0 z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-3 shadow-xl shadow-slate-900/10">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Quick choice")}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {presets.map((preset) => {
              const active = value?.start === preset.range.start && value?.end === preset.range.end;
              return (
                <button
                  key={preset.label}
                  onClick={() => choose(preset.range)}
                  className={`rounded-xl border px-2.5 py-2 text-start text-xs font-medium transition ${
                    active ? "border-brand bg-brand-soft text-brand-dark" : "border-line text-ink hover:border-brand/40 hover:bg-brand-soft/50"
                  }`}
                >
                  {t(preset.label)}
                </button>
              );
            })}
          </div>

          <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Custom dates")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted">
              {t("From")}
              <input type="date" value={start} max={end || today} onChange={(e) => setStart(e.target.value)} className={`mt-1 ${input}`} />
            </label>
            <label className="text-[11px] text-muted">
              {t("To")}
              <input type="date" value={end} min={start || undefined} max={today} onChange={(e) => setEnd(e.target.value)} className={`mt-1 ${input}`} />
            </label>
          </div>
          {invalid && <p className="mt-1.5 px-1 text-xs text-red-600">{t("Must be after the start date.")}</p>}

          <div className="mt-3 flex justify-end gap-2">
            {value && (
              <button onClick={() => choose(null)} className="h-9 rounded-xl px-3 text-xs font-semibold text-muted transition hover:text-ink">
                {t("Clear")}
              </button>
            )}
            <button
              onClick={() => choose({ start: start || end, end: end || start })}
              disabled={(!start && !end) || invalid}
              className="h-9 rounded-xl bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("Apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
