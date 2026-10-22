"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, CircleCheck, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, todayString } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { SavingsGoal, SavingsGoalDetail } from "@/types/savings";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import GoalForm, { GoalFormValues } from "./GoalForm";
import ContributionForm from "./ContributionForm";
import { goalIcon, goalTheme } from "./goalTheme";

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

// "~1 084 MAD/month" to reach the target on time, or a warning when the date has passed
function MonthlyPlan({ goal }: { goal: SavingsGoal }) {
  const { money } = useCurrency();
  if (goal.is_completed || goal.target_reached || !goal.target_date) return null;

  const months = monthsLeft(goal.target_date);
  if (months < 0) {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600">Date passed</span>;
  }
  return (
    <span className="rounded-full bg-background px-2 py-0.5">
      <span className="font-semibold text-ink">{money(Math.ceil(goal.remaining_amount / months))}</span>/month
    </span>
  );
}

function StatusChip({ goal }: { goal: SavingsGoal }) {
  if (goal.is_completed) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
        <CircleCheck size={11} /> Done
      </span>
    );
  }
  if (goal.target_reached) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Target reached</span>;
  }
  return null;
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

  const theme = goalTheme(goal.id);
  const Icon = goalIcon(goal.name);
  const percent = Math.min(goal.progress_percent, 100);

  return (
    <article className="group/card relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,31,23,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5">
      {/* Colored header */}
      <div className={`relative flex items-center gap-3 px-4 pb-3 pt-4 ${theme.soft}`}>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: theme.color }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">{goal.name}</h3>
            <StatusChip goal={goal} />
          </div>
          <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${theme.text}`}>
            <CalendarClock size={11} />
            {goal.target_date ? `By ${formatDate(goal.target_date)}` : "No deadline"}
          </p>
        </div>
        <span className="text-2xl font-bold tracking-tight" style={{ color: theme.color }}>
          {Math.round(percent)}
          <span className="text-sm">%</span>
        </span>
      </div>

      <div className="px-4 pt-3">
        <p className="truncate">
          <span className="text-lg font-bold text-ink">{money(goal.saved_amount)}</span>
          <span className="text-xs text-muted"> saved of {money(goal.target_amount)}</span>
        </p>

        {/* Progress with milestones at 25 / 50 / 75 % */}
        <div
          className="relative mt-2 h-2.5 rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.name} progress`}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percent}%`, background: theme.color }}
          />
          {[25, 50, 75].map((mark) => (
            <span
              key={mark}
              className={`absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                percent >= mark ? "bg-white" : "bg-slate-300"
              }`}
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <span className="rounded-full bg-background px-2 py-0.5">
            {goal.target_reached ? "Target reached 🎉" : (
              <>
                <span className="font-semibold text-ink">{money(goal.remaining_amount)}</span> to go
              </>
            )}
          </span>
          <MonthlyPlan goal={goal} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-line px-4 py-2.5">
        {!goal.is_completed && !goal.target_reached && (
          <Button size="xs" onClick={() => setModal("contribute")}>
            <Plus size={14} />
            Add money
          </Button>
        )}
        {goal.target_reached && !goal.is_completed && (
          <Button size="xs" onClick={() => setCompleted(true)} loading={busy}>
            <CircleCheck size={14} />
            Complete
          </Button>
        )}
        {goal.is_completed && (
          <Button size="xs" variant="secondary" onClick={() => setCompleted(false)} loading={busy}>
            <RotateCcw size={13} />
            Reopen
          </Button>
        )}
        <Button size="xs" variant="ghost" onClick={toggleHistory} aria-expanded={historyOpen}>
          History
          <ChevronDown size={13} className={`transition ${historyOpen ? "rotate-180" : ""}`} />
        </Button>
        <div className="ml-auto flex">
          <Button size="xs" variant="ghost" onClick={() => setModal("edit")} aria-label={`Edit ${goal.name}`} title="Edit">
            <Pencil size={14} />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={handleDelete}
            aria-label={`Delete ${goal.name}`}
            title="Delete"
            className="hover:!bg-red-50 hover:!text-red-600"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {historyOpen && (
        <div className="thin-scroll mx-4 mb-3 max-h-40 overflow-y-auto rounded-xl bg-background px-3 py-1.5">
          {!history ? (
            <p className="py-1.5 text-xs text-muted">Loading...</p>
          ) : history.length === 0 ? (
            <p className="py-1.5 text-xs text-muted">No contributions yet.</p>
          ) : (
            <ul className="divide-y divide-line text-xs">
              {history.map((contribution) => (
                <li key={contribution.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">+{money(contribution.amount)}</p>
                    <p className="truncate text-[11px] text-muted">
                      {formatDate(contribution.date)}
                      {contribution.note && ` · ${contribution.note}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteContribution(contribution.id, contribution.amount)}
                    aria-label="Delete contribution"
                    className="rounded-lg p-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={13} />
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
