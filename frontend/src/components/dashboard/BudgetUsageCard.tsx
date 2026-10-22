"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { DashboardData } from "@/types/dashboard";

const BAR_COLORS = { ok: "bg-brand", warning: "bg-amber-500", exceeded: "bg-rose-500" };
const TEXT_COLORS = { ok: "text-muted", warning: "text-amber-600", exceeded: "text-rose-600" };

export default function BudgetUsageCard({ budgets }: { budgets: DashboardData["budgets"] }) {
  const { money } = useCurrency();
  const all = [...(budgets.overall ? [budgets.overall] : []), ...budgets.categories];

  return (
    <Card
      title="Monthly budget"
      className="h-full"
      action={
        <Link href="/budgets" className="font-medium text-brand hover:underline">
          Manage
        </Link>
      }
    >
      {all.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-sm text-muted">No budget set for this month.</p>
      ) : (
        <div className="space-y-3.5">
          {all.map((budget) => (
            <div key={budget.id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={`truncate ${budget.is_overall ? "font-semibold text-ink" : "text-ink"}`}>{budget.category}</span>
                <span className={`shrink-0 font-semibold ${TEXT_COLORS[budget.status]}`}>{Math.round(budget.percent_used)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[budget.status]}`}
                  style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {budget.status === "exceeded"
                  ? `${money(budget.spent - budget.amount_limit)} over · ${money(budget.amount_limit)} limit`
                  : `${money(budget.spent)} of ${money(budget.amount_limit)} · ${money(budget.remaining)} left`}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
