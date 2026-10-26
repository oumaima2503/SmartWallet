"use client";

import {
  Calculator,
  ChartColumn,
  CircleAlert,
  Info,
  Lightbulb,
  PiggyBank,
  Sparkles,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { categoryIcon } from "@/lib/categoryIcons";
import { useCurrency } from "@/lib/currency";
import { formatDate, formatMonth } from "@/lib/format";
import { BudgetStat, Insight, Report } from "@/types/reports";
import Hero from "@/components/ui/Hero";
import Amount from "@/components/ui/Amount";
import { t } from "@/lib/i18n";

// Calculated numbers and AI text always look different:
// grey "Calculated" tag for numbers, violet "AI" tag and tint for the AI interpretation.

function CalculatedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted">
      <Calculator size={10} />
      {t("Calculated")}
    </span>
  );
}

function AiTag({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        light ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
      }`}
    >
      <Sparkles size={10} />
      AI
    </span>
  );
}

function Evidence({ text }: { text: string }) {
  if (!text) return null;
  return <p className="mt-1 text-[11px] text-muted">{t("Based on:")} {text}</p>;
}

function SectionCard({
  icon: Icon,
  color,
  title,
  tag,
  className = "",
  children,
}: {
  icon: typeof Info;
  color: string;
  title: string;
  tag?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
            <Icon size={16} />
          </span>
          {title}
        </h2>
        {tag}
      </div>
      {children}
    </section>
  );
}

function InsightList({ items, empty }: { items: Insight[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="rounded-xl bg-violet-50/60 p-3 text-sm">
          <p className="font-semibold text-ink">{item.title}</p>
          <p className="mt-0.5 text-ink/80">{item.detail}</p>
          <Evidence text={item.evidence} />
        </li>
      ))}
    </ul>
  );
}

const STATUS = {
  ok: { bar: "bg-brand", text: "text-brand-dark", label: "On track" },
  warning: { bar: "bg-amber-500", text: "text-amber-700", label: "Close to limit" },
  exceeded: { bar: "bg-rose-500", text: "text-rose-600", label: "Exceeded" },
};

function BudgetLine({ budget }: { budget: BudgetStat }) {
  const { money } = useCurrency();
  const style = STATUS[budget.status];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-ink">{budget.is_overall ? t("Overall budget") : t(budget.category)}</span>
        <span className={`font-semibold ${style.text}`}>
          {Math.round(budget.percent_used)}% · {t(style.label)}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className="absolute inset-y-0 start-[80%] w-px bg-ink/25" title={t("Alert at 80%")} aria-hidden="true" />
        <div className={`fill-in h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(budget.percent_used, 100)}%` }} />
      </div>
      <p className="mt-0.5 text-[11px] text-muted">
        {t("{spent} of {limit}", { spent: money(budget.spent), limit: money(budget.limit) })}
      </p>
    </div>
  );
}

type Props = {
  report: Report;
  // Buttons shown in the header card (regenerate, download...)
  actions?: React.ReactNode;
};

export default function ReportView({ report, actions }: Props) {
  const { money, currency } = useCurrency();
  const { statistics: s, analysis: a } = report;
  const budgets = [...(s.budgets.overall ? [s.budgets.overall] : []), ...s.budgets.categories];
  const spentCategories = s.categories.filter((c) => c.total > 0);
  const biggest = Math.max(...spentCategories.map((c) => c.total), 1);

  const stats = [
    { label: t("Income"), value: s.totals.income, icon: TrendingUp },
    { label: t("Expenses"), value: s.totals.expenses, icon: TrendingDown },
    { label: t("Balance"), value: s.totals.net, icon: Wallet },
    { label: t("Saved to goals"), value: s.totals.saved_to_goals, icon: PiggyBank },
  ];

  return (
    <div className="space-y-4">
      {/* Header card: month, numbers, AI summary */}
      <Hero tone="violet">

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-white/70">{t("Monthly report · generated {date}", { date: formatDate(report.created_at.slice(0, 10)) })}</p>
            <h2 className="text-2xl font-bold tracking-tight">{formatMonth(report.month)}</h2>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-white/12 px-3 py-2 backdrop-blur" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <Icon size={12} />
                {label}
              </p>
              <p className="truncate">
                <Amount value={value} size="card" />
              </p>
            </div>
          ))}
        </div>

        <div className="relative mt-4 rounded-xl bg-surface p-4 text-ink">
          <div className="mb-1.5 flex items-center gap-2">
            <AiTag />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("Summary")}</span>
          </div>
          <p className="text-sm leading-relaxed">{a.overview}</p>
        </div>
      </Hero>

      {a.history_note && (
        <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Info size={17} className="mt-0.5 shrink-0" />
          <p>{a.history_note}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Spending patterns */}
        <SectionCard icon={ChartColumn} color="bg-amber-50 text-amber-600" title={t("Spending patterns")} tag={<CalculatedTag />}>
          <ul className="space-y-2.5">
            {spentCategories.map((c) => {
              const Icon = categoryIcon(c.category);
              const isNew = c.previous_month_total === 0;
              return (
                <li key={c.category} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink/70">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-ink">{t(c.category)}</span>
                      <span className="shrink-0 font-semibold text-ink">{money(c.total)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="fill-in h-full rounded-full bg-amber-400" style={{ width: `${(c.total / biggest) * 100}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-end text-[10px] text-muted">
                        {isNew
                          ? t("new")
                          : c.change_percent === null
                            ? `${c.percent_of_expenses}%`
                            : `${c.change_percent > 0 ? "▲" : c.change_percent < 0 ? "▼" : ""} ${Math.abs(c.change_percent)}%`}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-2">
              <AiTag />
            </div>
            <InsightList items={a.spending_patterns} empty="No notable pattern this month." />
          </div>
        </SectionCard>

        {/* Budget concerns */}
        <SectionCard icon={CircleAlert} color="bg-rose-50 text-rose-500" title={t("Budget concerns")} tag={budgets.length > 0 ? <CalculatedTag /> : undefined}>
          {budgets.length === 0 ? (
            <p className="text-sm text-muted">{t("No budget was set for this month.")}</p>
          ) : (
            <div className="space-y-3">
              {budgets.map((budget) => (
                <BudgetLine key={budget.category} budget={budget} />
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-2">
              <AiTag />
            </div>
            {a.budget_concerns.length > 0 ? (
              <ul className="space-y-2.5">
                {a.budget_concerns.map((concern, i) => (
                  <li key={i} className="rounded-xl bg-rose-50/70 p-3 text-sm">
                    <p className="font-semibold text-ink">{concern.category === "Overall" ? t("Overall budget") : t(concern.category)}</p>
                    <p className="mt-0.5 text-ink/80">{concern.detail}</p>
                    <Evidence text={concern.evidence} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">{t("All budgets stayed under 80% of their limit.")}</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Positive observations */}
      <SectionCard icon={ThumbsUp} color="bg-brand-soft text-brand" title={t("Positive observations")} tag={<AiTag />}>
        {a.positive_observations.length === 0 ? (
          <p className="text-sm text-muted">{t("Nothing stood out this month.")}</p>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {a.positive_observations.map((item, i) => (
              <li key={i} className="rounded-xl border border-brand/15 bg-brand-soft/50 p-3 text-sm">
                <p className="font-semibold text-brand-dark">{item.title}</p>
                <p className="mt-0.5 text-ink/80">{item.detail}</p>
                <Evidence text={item.evidence} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Recommendations */}
      <SectionCard icon={Lightbulb} color="bg-violet-50 text-violet-600" title={t("Recommendations for next month")} tag={<AiTag />}>
        <ol className="grid gap-3 md:grid-cols-2">
          {a.recommendations.map((rec, i) => (
            <li key={i} className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-surface p-4 text-sm">
              <span className="absolute end-3 top-2 text-3xl font-black text-violet-100">{i + 1}</span>
              <p className="relative pe-8 font-semibold text-ink">{rec.action}</p>
              <p className="relative mt-1 text-ink/80">{rec.reason}</p>
              <Evidence text={rec.evidence} />
            </li>
          ))}
        </ol>
      </SectionCard>

      <p className="px-1 text-[11px] text-muted">
        {t("Numbers are calculated from your recorded transactions, budgets and savings. The AI only explains them. Suggestions are general budgeting tips, not professional financial advice.")}
        {currency !== "MAD" && ` ${t("The AI text was written with amounts in MAD; the calculated numbers follow your currency.")}`}
      </p>
    </div>
  );
}
