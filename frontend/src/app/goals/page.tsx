"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { SavingsGoalsResponse } from "@/types/savings";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import GoalCard from "@/components/savings/GoalCard";
import GoalForm, { GoalFormValues } from "@/components/savings/GoalForm";
import Hero from "@/components/ui/Hero";
import Amount from "@/components/ui/Amount";
import { t } from "@/lib/i18n";

// Big header card: overall ring, total saved, and the goal closest to its target
function GoalsHero({ data, money }: { data: SavingsGoalsResponse; money: (amount: number) => string }) {
  const { summary, goals } = data;
  const percent = summary.total_target > 0 ? Math.min((summary.total_saved / summary.total_target) * 100, 100) : 0;
  const active = goals.filter((goal) => !goal.is_completed);
  const closest = [...active].sort((a, b) => b.progress_percent - a.progress_percent)[0];
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <Hero className="mt-5">

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
                className="ring-in transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{Math.round(percent)}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/75">{t("You have saved")}</p>
            <p className="truncate">
              <Amount value={summary.total_saved} size="hero" />
            </p>
            <p className="text-xs text-white/75">of {money(summary.total_target)} across all your goals</p>
          </div>
        </div>

        <div className="flex gap-2 md:ms-auto">
          {[
            ["Active", active.length],
            ["Completed", summary.completed_goals],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur">
              <p className="text-lg font-bold leading-tight">{value}</p>
              <p className="text-[11px] text-white/75">{label}</p>
            </div>
          ))}
        </div>

        {closest && (
          <div className="rounded-xl bg-white px-4 py-3 text-ink md:w-64">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("Closest to the finish")}</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{closest.name}</p>
            <p className="text-xs text-muted">
              {closest.target_reached
                ? "Target reached, mark it as completed!"
                : `${money(closest.remaining_amount)} ${t("to go")} · ${Math.round(closest.progress_percent)}%`}
            </p>
          </div>
        )}
      </div>
    </Hero>
  );
}

// Dashed card that invites to add another goal (fills the grid nicely)
function AddGoalCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/50 p-4 text-center transition hover:border-brand hover:bg-brand-soft/40"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
        <Plus size={20} />
      </span>
      <span className="text-sm font-semibold text-ink">{t("New goal")}</span>
      <span className="max-w-[12rem] text-xs text-muted">{t("A trip, a car, an emergency fund... what's next?")}</span>
    </button>
  );
}

export default function GoalsPage() {
  const { money } = useCurrency();
  const { toast } = useFeedback();
  const [data, setData] = useState<SavingsGoalsResponse | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      setData(await api<SavingsGoalsResponse>("/api/savings-goals"));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  async function createGoal(values: GoalFormValues) {
    await api("/api/savings-goals", { method: "POST", body: JSON.stringify(values) });
    setShowForm(false);
    toast.success(`"${values.name}" created. Add money whenever you're ready.`);
    await loadGoals();
  }

  const active = data?.goals.filter((goal) => !goal.is_completed) ?? [];
  const completed = data?.goals.filter((goal) => goal.is_completed) ?? [];

  return (
    <main className="page">
      <PageHeader title={t("Savings goals")} subtitle={t("Put money aside for the things that matter to you.")}>
        {data && data.goals.length > 0 && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} />
            {t("New goal")}
          </Button>
        )}
      </PageHeader>

      {error && !data && (
        <div className="mt-5">
          <ErrorState message={`${t("We couldn't load your goals.")} ${error}`} onRetry={loadGoals} />
        </div>
      )}

      {!data && !error && (
        <>
          <Skeleton className="mt-5 h-20 rounded-2xl" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </>
      )}

      {data && data.goals.length === 0 && (
        <div className="mt-5">
          <EmptyState
            icon={Target}
            illustration="goal"
            title={t("Start your first savings goal")}
            text={t("A laptop, a trip, an emergency fund... Set a target and track every dirham you put aside.")}
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus size={18} />
                {t("Create a goal")}
              </Button>
            }
          />
        </div>
      )}

      {data && data.goals.length > 0 && (
        <>
          <GoalsHero data={data} money={money} />

          {active.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("In progress")}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onChange={loadGoals} />
                ))}
                <AddGoalCard onClick={() => setShowForm(true)} />
              </div>
            </section>
          )}

          {active.length === 0 && (
            <section className="mt-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AddGoalCard onClick={() => setShowForm(true)} />
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("Completed")}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {completed.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onChange={loadGoals} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Modal
        open={showForm}
        title={t("New savings goal")}
        description={t("What are you saving for?")}
        onClose={() => setShowForm(false)}
      >
        <GoalForm submitLabel="Create goal" onSubmit={createGoal} onCancel={() => setShowForm(false)} />
      </Modal>
    </main>
  );
}
