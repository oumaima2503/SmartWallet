import { Calculator, CircleAlert, Info, Lightbulb, Sparkles, ThumbsUp } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatMonth } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { BudgetStat, Insight, Report } from "@/types/reports";

// Calculated numbers and AI text are always shown with different tags and colors

function CalculatedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-muted">
      <Calculator size={11} />
      Calculated from your records
    </span>
  );
}

function AiBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
        <Sparkles size={12} />
        AI interpretation
      </p>
      <div className="space-y-3 text-sm text-ink">{children}</div>
    </div>
  );
}

function Evidence({ text }: { text: string }) {
  if (!text) return null;
  return <p className="mt-1 text-xs text-muted">Based on: {text}</p>;
}

function InsightList({ items, empty }: { items: Insight[]; empty: string }) {
  if (items.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i}>
          <p className="font-semibold">{item.title}</p>
          <p className="text-ink/90">{item.detail}</p>
          <Evidence text={item.evidence} />
        </li>
      ))}
    </ul>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-3 font-semibold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand-dark">
          {number}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

const STATUS_STYLE = {
  ok: { bar: "bg-brand", text: "text-brand-dark", label: "On track" },
  warning: { bar: "bg-amber-500", text: "text-amber-700", label: "Close to limit" },
  exceeded: { bar: "bg-red-500", text: "text-red-600", label: "Exceeded" },
};

function BudgetLine({ budget }: { budget: BudgetStat }) {
  const { money } = useCurrency();
  const style = STATUS_STYLE[budget.status];
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{budget.is_overall ? "Overall budget" : budget.category}</span>
        <span className="text-muted">
          {money(budget.spent)} / {money(budget.limit)} ·{" "}
          <span className={`font-semibold ${style.text}`}>
            {budget.percent_used}% · {style.label}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(budget.percent_used, 100)}%` }} />
      </div>
    </div>
  );
}

function Change({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-muted">-</span>;
  // Shown as a neutral increase / decrease: context decides if it is good or bad
  return (
    <span className="font-medium text-ink">
      {percent > 0 ? "▲" : percent < 0 ? "▼" : ""} {Math.abs(percent)}%
    </span>
  );
}

export default function ReportView({ report }: { report: Report }) {
  const { statistics: s, analysis: a } = report;
  const { money, currency } = useCurrency();
  const budgets = [...(s.budgets.overall ? [s.budgets.overall] : []), ...s.budgets.categories];
  const concerns = budgets.filter((b) => b.status !== "ok");

  return (
    <div className="space-y-4">
      {a.history_note && (
        <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p>{a.history_note}</p>
        </div>
      )}

      <Section number={1} title="Monthly overview">
        <div className="flex items-center justify-between">
          <CalculatedTag />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Income", money(s.totals.income)],
            ["Expenses", money(s.totals.expenses)],
            ["Income - expenses", money(s.totals.net)],
            ["Put aside for goals", money(s.totals.saved_to_goals)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-background p-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-0.5 font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>
        {s.history.previous_month && (
          <p className="text-sm text-muted">
            Expenses vs {formatMonth(s.history.previous_month.month)}:{" "}
            <Change percent={s.history.previous_month.change_percent} /> (
            {money(s.history.previous_month.expenses)} last month)
          </p>
        )}
        <AiBlock>
          <p>{a.overview}</p>
        </AiBlock>
      </Section>

      <Section number={2} title="Spending patterns">
        <CalculatedTag />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Spent</th>
                <th className="py-2 text-right font-medium">Share</th>
                <th className="py-2 text-right font-medium">vs last month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.categories
                .filter((c) => c.total > 0)
                .map((c) => (
                  <tr key={c.category}>
                    <td className="py-2 text-ink">{c.category}</td>
                    <td className="py-2 text-right font-medium text-ink">{money(c.total)}</td>
                    <td className="py-2 text-right text-muted">{c.percent_of_expenses}%</td>
                    <td className="py-2 text-right">
                      {c.previous_month_total === 0 ? (
                        <span className="text-xs font-medium text-muted">New this month</span>
                      ) : (
                        <Change percent={c.change_percent} />
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AiBlock>
          <InsightList items={a.spending_patterns} empty="No notable pattern this month." />
        </AiBlock>
      </Section>

      <Section number={3} title="Budget concerns">
        {budgets.length === 0 ? (
          <p className="text-sm text-muted">No budget was set for this month.</p>
        ) : (
          <>
            <CalculatedTag />
            <div className="space-y-4">
              {budgets.map((budget) => (
                <BudgetLine key={budget.category} budget={budget} />
              ))}
            </div>
          </>
        )}
        {concerns.length > 0 && a.budget_concerns.length > 0 ? (
          <AiBlock>
            <ul className="space-y-3">
              {a.budget_concerns.map((concern, i) => (
                <li key={i} className="flex gap-2">
                  <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">{concern.category === "Overall" ? "Overall budget" : concern.category}</p>
                    <p className="text-ink/90">{concern.detail}</p>
                    <Evidence text={concern.evidence} />
                  </div>
                </li>
              ))}
            </ul>
          </AiBlock>
        ) : (
          budgets.length > 0 && (
            <p className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">All budgets stayed under 80% of their limit.</p>
          )
        )}
      </Section>

      <Section number={4} title="Positive observations">
        <AiBlock>
          <div className="flex gap-2">
            <ThumbsUp size={16} className="mt-0.5 shrink-0 text-brand" />
            <div className="flex-1">
              <InsightList items={a.positive_observations} empty="Nothing stood out this month." />
            </div>
          </div>
        </AiBlock>
      </Section>

      <Section number={5} title="Recommendations">
        <AiBlock>
          <ol className="space-y-4">
            {a.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-violet-700">
                  {i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Lightbulb size={14} className="text-amber-500" />
                    {rec.action}
                  </p>
                  <p className="text-ink/90">{rec.reason}</p>
                  <Evidence text={rec.evidence} />
                </div>
              </li>
            ))}
          </ol>
        </AiBlock>
      </Section>

      <p className="px-1 text-xs text-muted">
        Numbers are calculated from your recorded transactions, budgets and savings. The AI only explains them.
        Suggestions are general budgeting tips, not professional financial advice.
        {currency !== "MAD" && " The AI text was written with amounts in MAD; the calculated numbers above follow your currency."}
      </p>
    </div>
  );
}
