"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { SavingsGoalsResponse } from "@/types/savings";
import GoalCard from "@/components/savings/GoalCard";
import GoalForm, { GoalFormValues } from "@/components/savings/GoalForm";

export default function SavingsPage() {
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
    await loadGoals();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Savings goals</h1>
          <p className="text-sm text-slate-500">Track the money you put aside for your goals.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            New goal
          </button>
        )}
      </div>

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total saved" value={formatMoney(data.summary.total_saved)} />
          <SummaryCard label="Total targets" value={formatMoney(data.summary.total_target)} />
          <SummaryCard
            label="Completed goals"
            value={`${data.summary.completed_goals} / ${data.summary.total_goals}`}
          />
        </div>
      )}

      {showForm && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">New savings goal</h2>
          <GoalForm submitLabel="Create goal" onSubmit={createGoal} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load goals: {error}</p>}

      {!data && !error && <p className="mt-6 text-slate-500">Loading...</p>}

      {data && data.goals.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No savings goals yet. Create your first one.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data?.goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onChange={loadGoals} />
        ))}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
