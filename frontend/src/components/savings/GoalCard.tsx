"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, CircleCheck, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, todayString } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { SavingsGoal, SavingsGoalDetail } from "@/types/savings";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import GoalForm, { GoalFormValues } from "./GoalForm";
import ContributionForm from "./ContributionForm";

type Props = {
  goal: SavingsGoal;
  onChange: () => void;
};

// Whole months between today and the target date (at least 1)
function monthsLeft(targetDate: string) {
  const today = new Date(`${todayString()}T00:00:00`);
  const target = new Date(`${targetDate}T00:00:00`);
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return target < today ? -1 : Math.max(months, 1);
}

function DeadlineHint({ goal }: { goal: SavingsGoal }) {
  const { money } = useCurrency();
  if (goal.is_completed || goal.target_reached) return null;
  if (!goal.target_date) return null;

  const months = monthsLeft(goal.target_date);
  if (months < 0) {
    return <p className="text-xs font-medium text-red-600">Target date passed</p>;
  }
  return (
    <p className="text-xs text-muted">
      Save about <span className="font-semibold text-ink">{money(Math.ceil(goal.remaining_amount / months))}</span>{" "}
      per month to reach it on time
    </p>
  );
}

function StatusBadge({ goal }: { goal: SavingsGoal }) {
  if (goal.is_completed) {
    return <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">Completed</span>;
  }
  if (goal.target_reached) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Target reached</span>;
  }
  return <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">In progress</span>;
}

export default function GoalCard({ goal, onChange }: Props) {
  const { money } = useCurrency();
  const { toast, confirm } = useFeedback();
  const [modal, setModal] = useState<"edit" | "contribute" | null>(null);
  const [history, setHistory] = useState<SavingsGoalDetail["contributions"] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadHistory() {
    const detail = await api<SavingsGoalDetail>(`/api/savings-goals/${goal.id}`);
    setHistory(detail.contributions);
  }

  async function refresh() {
    if (historyOpen) await loadHistory();
    onChange();
  }

  async function handleEdit(values: GoalFormValues) {
    await api(`/api/savings-goals/${goal.id}`, { method: "PUT", body: JSON.stringify(values) });
    setModal(null);
    toast.success("Goal updated.");
    await refresh();
  }

  async function handleContribution(values: { amount: number; date: string; note: string }) {
    const updated = await api<SavingsGoal>(`/api/savings-goals/${goal.id}/contributions`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    setModal(null);
    toast.success(
      updated.target_reached
        ? `${money(values.amount)} added. You reached your target!`
        : `${money(values.amount)} added to ${goal.name}.`
    );
    await refresh();
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete "${goal.name}"?`,
      message: `This also deletes its ${money(goal.saved_amount)} of recorded contributions. This can't be undone.`,
      confirmLabel: "Delete goal",
      danger: true,
    });
    if (ok) runAction(() => api(`/api/savings-goals/${goal.id}`, { method: "DELETE" }), "Goal deleted.");
  }

  function setCompleted(isCompleted: boolean) {
    runAction(
      () => api(`/api/savings-goals/${goal.id}`, { method: "PUT", body: JSON.stringify({ is_completed: isCompleted }) }),
      isCompleted ? "Congratulations, goal completed!" : "Goal reopened."
    );
  }

  async function deleteContribution(contributionId: number, amount: number) {
    const ok = await confirm({
      title: "Delete this contribution?",
      message: `${money(amount)} will be removed from ${goal.name}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) {
      runAction(
        () => api(`/api/savings-goals/${goal.id}/contributions/${contributionId}`, { method: "DELETE" }),
        "Contribution deleted."
      );
    }
  }

  async function toggleHistory() {
    if (historyOpen) return setHistoryOpen(false);
    setHistoryOpen(true);
    try {
      await loadHistory();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              goal.is_completed ? "bg-brand text-white" : "bg-brand-soft text-brand"
            }`}
          >
            {goal.is_completed ? <CircleCheck size={20} /> : <Target size={20} />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink">{goal.name}</h3>
            <p className="flex items-center gap-1 text-xs text-muted">
              <CalendarClock size={13} />
              {goal.target_date ? formatDate(goal.target_date) : "No target date"}
            </p>
          </div>
        </div>
        <StatusBadge goal={goal} />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-2">
          <p>
            <span className="text-2xl font-bold text-ink">{money(goal.saved_amount)}</span>
            <span className="text-sm text-muted"> of {money(goal.target_amount)}</span>
          </p>
          <span className="text-sm font-semibold text-ink">{goal.progress_percent}%</span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={goal.progress_percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.name} progress`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${goal.target_reached ? "bg-brand" : "bg-sky-500"}`}
            style={{ width: `${goal.progress_percent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm text-muted">
            {goal.target_reached ? "Target reached" : `${money(goal.remaining_amount)} to go`}
          </p>
          <DeadlineHint goal={goal} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {!goal.is_completed && !goal.target_reached && (
          <Button size="sm" onClick={() => setModal("contribute")}>
            <Plus size={16} />
            Add money
          </Button>
        )}
        {goal.target_reached && !goal.is_completed && (
          <Button size="sm" onClick={() => setCompleted(true)} loading={busy}>
            <CircleCheck size={16} />
            Mark as completed
          </Button>
        )}
        {goal.is_completed && (
          <Button size="sm" variant="secondary" onClick={() => setCompleted(false)} loading={busy}>
            <RotateCcw size={15} />
            Reopen
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={toggleHistory} aria-expanded={historyOpen}>
          History
          <ChevronDown size={15} className={`transition ${historyOpen ? "rotate-180" : ""}`} />
        </Button>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setModal("edit")} aria-label={`Edit ${goal.name}`} title="Edit">
            <Pencil size={15} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            aria-label={`Delete ${goal.name}`}
            title="Delete"
            className="hover:!bg-red-50 hover:!text-red-600"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {historyOpen && (
        <div className="mt-3 rounded-xl bg-background p-3">
          {!history ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted">No contributions yet. Add money to start tracking.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {history.map((contribution) => (
                <li key={contribution.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">+{money(contribution.amount)}</p>
                    <p className="truncate text-xs text-muted">
                      {formatDate(contribution.date)}
                      {contribution.note && ` · ${contribution.note}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteContribution(contribution.id, contribution.amount)}
                    aria-label="Delete contribution"
                    className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={modal === "edit"} title="Edit goal" onClose={() => setModal(null)}>
        <GoalForm
          initial={{ name: goal.name, target_amount: goal.target_amount, target_date: goal.target_date }}
          submitLabel="Save changes"
          onSubmit={handleEdit}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal
        open={modal === "contribute"}
        title={`Add money to ${goal.name}`}
        description={`${money(goal.remaining_amount)} left to reach ${money(goal.target_amount)}.`}
        onClose={() => setModal(null)}
      >
        <ContributionForm
          remaining={goal.remaining_amount}
          onSubmit={handleContribution}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </article>
  );
}
