"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, Flag, PiggyBank, Plus, Target } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { SavingsGoalsResponse } from "@/types/savings";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import GoalCard from "@/components/savings/GoalCard";
import GoalForm, { GoalFormValues } from "@/components/savings/GoalForm";

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
      <PageHeader title="Savings goals" subtitle="Put money aside for the things that matter to you.">
        {data && data.goals.length > 0 && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} />
            New goal
          </Button>
        )}
      </PageHeader>

      {error && !data && (
        <div className="mt-6">
          <ErrorState message={`We couldn't load your goals. ${error}`} onRetry={loadGoals} />
        </div>
      )}

      {!data && !error && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[88px]" />
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </>
      )}

      {data && data.goals.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={Target}
            title="Start your first savings goal"
            text="A laptop, a trip, an emergency fund... Set a target and track every dirham you put aside."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus size={18} />
                Create a goal
              </Button>
            }
          />
        </div>
      )}

      {data && data.goals.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total saved" value={money(data.summary.total_saved)} icon={PiggyBank} />
            <StatCard label="Total targets" value={money(data.summary.total_target)} icon={Flag} tone="blue" />
            <StatCard
              label="Completed goals"
              value={`${data.summary.completed_goals} of ${data.summary.total_goals}`}
              icon={CircleCheck}
              tone="amber"
            />
          </div>

          {active.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">In progress</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onChange={loadGoals} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Completed</h2>
              <div className="grid gap-4 md:grid-cols-2">
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
        title="New savings goal"
        description="What are you saving for?"
        onClose={() => setShowForm(false)}
      >
        <GoalForm submitLabel="Create goal" onSubmit={createGoal} onCancel={() => setShowForm(false)} />
      </Modal>
    </main>
  );
}
