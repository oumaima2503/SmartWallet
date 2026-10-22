"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Lightbulb, Sparkles, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { formatMonth } from "@/lib/format";
import { Report } from "@/types/reports";

type Insight = { kind: "good" | "concern" | "tip"; title: string; text: string };

const KIND_STYLE = {
  good: { icon: ThumbsUp, chip: "bg-white/15", label: "Going well" },
  concern: { icon: CircleAlert, chip: "bg-amber-300/25", label: "Watch out" },
  tip: { icon: Lightbulb, chip: "bg-white/15", label: "Tip" },
};

// Slim banner with the saved AI report of the month (never runs the AI by itself)
export default function AiInsights({ month }: { month: string }) {
  const { currency } = useCurrency();
  const [report, setReport] = useState<Report | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setReport(undefined);
    api<Report | null>(`/api/reports/${month}`)
      .then((data) => !cancelled && setReport(data))
      .catch(() => !cancelled && setReport(null));
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (report === undefined) return <div className="h-28 animate-pulse rounded-2xl bg-violet-100/60" />;

  const insights: Insight[] = report
    ? [
        ...report.analysis.positive_observations.slice(0, 1).map((i) => ({ kind: "good" as const, title: i.title, text: i.detail })),
        ...report.analysis.budget_concerns.slice(0, 1).map((i) => ({
          kind: "concern" as const,
          title: i.category === "Overall" ? "Overall budget" : i.category,
          text: i.detail,
        })),
        ...report.analysis.recommendations.slice(0, 1).map((i) => ({ kind: "tip" as const, title: i.action, text: i.reason })),
      ]
    : [];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 p-4 text-white shadow-md shadow-violet-600/20 sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-14 left-1/3 h-28 w-28 rounded-full bg-white/5" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-start gap-3 lg:w-56">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">AI insights · {formatMonth(month)}</h2>
            <p className="mt-0.5 text-xs text-white/75">
              {report ? "From your monthly report" : "Let AI explain your month in a few seconds."}
            </p>
            {report && currency !== "MAD" && <p className="mt-1 text-[10px] text-white/60">Amounts in the text are in MAD</p>}
          </div>
        </div>

        {report ? (
          <ul className="grid flex-1 gap-2 sm:grid-cols-3">
            {insights.map((insight, i) => {
              const style = KIND_STYLE[insight.kind];
              const Icon = style.icon;
              return (
                <li key={i} className={`rounded-xl p-3 text-xs backdrop-blur ${style.chip}`}>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    <Icon size={12} />
                    {style.label}
                  </p>
                  <p className="mt-1 line-clamp-1 font-semibold">{insight.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-white/80">{insight.text}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex-1 text-sm text-white/85">
            See your main spending categories, budgets close to their limit and practical tips based on your real numbers.
          </p>
        )}

        <Link
          href="/reports"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-xl bg-white px-3.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 lg:self-center"
        >
          {report ? "Full report" : "Generate report"}
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
