"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { SavingsGoal, SavingsGoalDetail } from "@/types/savings";
import GoalForm, { GoalFormValues } from "./GoalForm";
import ContributionForm from "./ContributionForm";

type Props = {
  goal: SavingsGoal;
  onChange: () => void;
};

type Mode = "view" | "edit" | "contribute";

export default function GoalCard({ goal, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [history, setHistory] = useState<SavingsGoalDetail["contributions"] | null>(null);
  const [error, setError] = useState("");

  async function loadHistory() {
    const detail = await api<SavingsGoalDetail>(`/api/savings-goals/${goal.id}`);
    setHistory(detail.contributions);
  }

  // Runs an action, then refreshes the list (and the history if it is open)
  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      if (history) await loadHistory();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleEdit(values: GoalFormValues) {
    await api(`/api/savings-goals/${goal.id}`, { method: "PUT", body: JSON.stringify(values) });
    setMode("view");
    onChange();
  }

  async function handleContribution(values: { amount: number; date: string; note: string }) {
    await api(`/api/savings-goals/${goal.id}/contributions`, { method: "POST", body: JSON.stringify(values) });
    setMode("view");
    if (history) await loadHistory();
    onChange();
  }

  function handleDelete() {
    if (!confirm(`Delete "${goal.name}" and all its contributions?`)) return;
    run(() => api(`/api/savings-goals/${goal.id}`, { method: "DELETE" }));
  }

  function setCompleted(isCompleted: boolean) {
    run(() =>
      api(`/api/savings-goals/${goal.id}`, { method: "PUT", body: JSON.stringify({ is_completed: isCompleted }) })
    );
  }

  function deleteContribution(contributionId: number) {
    if (!confirm("Delete this contribution?")) return;
    run(() => api(`/api/savings-goals/${goal.id}/contributions/${contributionId}`, { method: "DELETE" }));
  }

  function toggleHistory() {
    if (history) setHistory(null);
    else run(loadHistory);
  }

  if (mode === "edit") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold">Edit goal</h3>
        <GoalForm
          initial={{ name: goal.name, target_amount: goal.target_amount, target_date: goal.target_date }}
          submitLabel="Save changes"
          onSubmit={handleEdit}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{goal.name}</h3>
          <p className="text-sm text-slate-500">
            {goal.target_date ? `Target date: ${formatDate(goal.target_date)}` : "No target date"}
          </p>
        </div>
        <StatusBadge goal={goal} />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <span className="text-xl font-bold">{formatMoney(goal.saved_amount)}</span>
            <span className="text-slate-500"> / {formatMoney(goal.target_amount)}</span>
          </span>
          <span className="font-medium text-slate-700">{goal.progress_percent}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${goal.target_reached ? "bg-emerald-500" : "bg-sky-500"}`}
            style={{ width: `${goal.progress_percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {goal.target_reached ? "Target reached" : `${formatMoney(goal.remaining_amount)} remaining`}
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {mode === "contribute" ? (
        <div className="mt-4">
          <ContributionForm onSubmit={handleContribution} onCancel={() => setMode("view")} />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {!goal.is_completed && (
            <button
              onClick={() => setMode("contribute")}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              Add contribution
            </button>
          )}
          {goal.target_reached && !goal.is_completed && (
            <button
              onClick={() => setCompleted(true)}
              className="rounded-lg border border-emerald-600 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Mark as completed
            </button>
          )}
          {goal.is_completed && (
            <button onClick={() => setCompleted(false)} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
              Reopen goal
            </button>
          )}
          <button onClick={toggleHistory} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            {history ? "Hide history" : "History"}
          </button>
          <button onClick={() => setMode("edit")} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            Edit
          </button>
          <button onClick={handleDelete} className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      )}

      {history && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No contributions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {history.map((contribution) => (
                <li key={contribution.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <span className="font-medium">{formatMoney(contribution.amount)}</span>
                    <span className="text-slate-500"> · {formatDate(contribution.date)}</span>
                    {contribution.note && <span className="text-slate-500"> · {contribution.note}</span>}
                  </div>
                  <button
                    onClick={() => deleteContribution(contribution.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ goal }: { goal: SavingsGoal }) {
  if (goal.is_completed) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Completed</span>;
  }
  if (goal.target_reached) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Target reached</span>;
  }
  return <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">In progress</span>;
}
