"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { DashboardData } from "@/types/dashboard";
import { t } from "@/lib/i18n";
import Pager, { usePaged } from "@/components/ui/Pager";

// Small progress ring for each goal
function Ring({ percent, done }: { percent: number; done: boolean }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--track)" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke={done ? "#0a8f4f" : "#0ea5e9"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
      />
    </svg>
  );
}

export default function GoalsProgress({ savings }: { savings: DashboardData["savings"] }) {
  const { money } = useCurrency();
  const paged = usePaged(savings.goals, 4);

  return (
    <Card
      title={t("Savings goals")}
      className="h-full"
      action={
        <Link href="/goals" className="font-medium text-brand hover:underline">
          {t("View all")}
        </Link>
      }
    >
      <p className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-dark">
        {t("{amount} saved this month", { amount: money(savings.saved_this_month) })} · {t("{amount} saved in total", { amount: money(savings.total_saved) })}
      </p>

      {savings.goals.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-4 text-sm text-muted">{t("No savings goals yet.")}</p>
      ) : (
        <>
        <ul key={paged.page} className="rise min-h-[12rem] flex-1 space-y-2.5">
          {paged.visible.map((goal) => (
            <li key={goal.id} className="flex items-center gap-3">
              <div className="relative">
                <Ring percent={goal.progress_percent} done={goal.target_reached} />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-ink">
                  {Math.round(goal.progress_percent)}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{goal.name}</p>
                <p className="truncate text-[11px] text-muted">
                  {t("{spent} of {limit}", { spent: money(goal.saved_amount), limit: money(goal.target_amount) })}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <Pager {...paged} onChange={paged.setPage} />
        </>
      )}
    </Card>
  );
}
