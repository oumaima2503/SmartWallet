"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Copy, Pencil, PiggyBank, Plus, Target, Trash2, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { categoryIcon } from "@/lib/categoryIcons";
import { useCurrency } from "@/lib/currency";
import { currentMonthString, formatMonth, todayString } from "@/lib/format";
import { Category } from "@/types/receipts";
import { Budget } from "@/types/transactions";
import { DashboardData } from "@/types/dashboard";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import MonthPicker from "@/components/dashboard/MonthPicker";
import BudgetForm, { BudgetFormValues } from "@/components/budgets/BudgetForm";

type Status = "ok" | "warning" | "exceeded";

const STATUS: Record<Status, { bar: string; chip: string; label: string }> = {
  ok: { bar: "bg-brand", chip: "bg-brand-soft text-brand-dark", label: "On track" },
  warning: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700", label: "Close to limit" },
  exceeded: { bar: "bg-rose-500", chip: "bg-rose-100 text-rose-700", label: "Over budget" },
};

function statusOf(budget: Budget): Status {
  const used = Number(budget.percentage_used);
  if (used > 100) return "exceeded";
  if (used >= 80) return "warning";
  return "ok";
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Days left in the month, counting today (only for the current month)
function daysLeft(month: string) {
  if (month !== currentMonthString()) return null;
  const today = new Date(`${todayString()}T00:00:00`);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return last - today.getDate() + 1;
}

type ModalState = { mode: "add"; preset?: { category_id: number | null; amount_limit: number } } | { mode: "edit"; budget: Budget } | null;

export default function BudgetsPage() {
  const { money } = useCurrency();
  const { toast, confirm } = useFeedback();
  const [month, setMonth] = useState(currentMonthString());
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [previousCount, setPreviousCount] = useState(0);
  const [spending, setSpending] = useState<DashboardData["spending_by_category"]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [copying, setCopying] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, previous, dashboard] = await Promise.all([
        api<Budget[]>(`/api/budgets?month=${month}`),
        api<Budget[]>(`/api/budgets?month=${shiftMonth(month, -1)}`),
        api<DashboardData>(`/api/dashboard?month=${month}`),
      ]);
      setBudgets(list);
      setPreviousCount(previous.length);
      setSpending(dashboard.spending_by_category);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [month]);

  useEffect(() => {
    setBudgets(null);
    load();
  }, [load]);

  useEffect(() => {
    api<Category[]>("/api/categories?type=expense")
      .then(setCategories)
      .catch(() => toast.error("Could not load your categories."));
  }, [toast]);

  const overall = budgets?.find((b) => b.category_id === null) ?? null;
  const categoryBudgets = budgets?.filter((b) => b.category_id !== null) ?? [];
  const takenIds = categoryBudgets.map((b) => b.category_id!) ;
  const alerts = (budgets ?? []).filter((b) => statusOf(b) !== "ok");
  const unbudgeted = spending.filter((s) => !takenIds.includes(s.category_id));

  async function save(values: BudgetFormValues) {
    if (modal?.mode === "edit") {
      await api(`/api/budgets/${modal.budget.id}`, { method: "PATCH", body: JSON.stringify(values) });
      toast.success("Budget updated.");
    } else {
      await api("/api/budgets", { method: "POST", body: JSON.stringify({ ...values, month }) });
      toast.success("Budget created.");
    }
    setModal(null);
    await load();
  }

  async function remove(budget: Budget) {
    const ok = await confirm({
      title: `Delete the ${budget.category_name ?? "overall"} budget?`,
      message: `Your expenses stay recorded; only the ${money(Number(budget.amount_limit))} limit for ${formatMonth(month)} is removed.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/budgets/${budget.id}`, { method: "DELETE" });
      toast.success("Budget deleted.");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // Creates this month's budgets with the same limits as last month
  async function copyPreviousMonth() {
    setCopying(true);
    try {
      const previous = await api<Budget[]>(`/api/budgets?month=${shiftMonth(month, -1)}`);
      for (const budget of previous) {
        await api("/api/budgets", {
          method: "POST",
          body: JSON.stringify({ month, category_id: budget.category_id, amount_limit: budget.amount_limit }),
        });
      }
      toast.success(`${previous.length} budget${previous.length > 1 ? "s" : ""} copied from ${formatMonth(shiftMonth(month, -1))}.`);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCopying(false);
    }
  }

  const left = daysLeft(month);

  return (
    <main className="page">
      <PageHeader title="Budgets" subtitle="Set monthly limits and see how much is left.">
        <MonthPicker value={month} onChange={setMonth} />
        <Button size="sm" onClick={() => setModal({ mode: "add" })} className="h-10 shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">New budget</span>
        </Button>
      </PageHeader>

      {error && !budgets && (
        <div className="mt-5">
          <ErrorState message={`We couldn't load your budgets. ${error}`} onRetry={load} />
        </div>
      )}

      {!budgets && !error && (
        <div className="mt-5 space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {budgets && budgets.length === 0 && (
        <div className="mt-5">
          <EmptyState
            icon={PiggyBank}
            title={`No budget for ${formatMonth(month)}`}
            text="Set an overall limit for the month, then add limits for the categories you want to watch."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                {previousCount > 0 && (
                  <Button variant="secondary" onClick={copyPreviousMonth} loading={copying}>
                    <Copy size={16} />
                    Copy {formatMonth(shiftMonth(month, -1))}
                  </Button>
                )}
                <Button onClick={() => setModal({ mode: "add" })}>
                  <Plus size={18} />
                  Create a budget
                </Button>
              </div>
            }
          />
        </div>
      )}

      {budgets && budgets.length > 0 && (
        <div className="mt-5 space-y-5">
          {/* Overall budget */}
          {overall ? (
            <OverallCard budget={overall} daysLeft={left} onEdit={() => setModal({ mode: "edit", budget: overall })} onDelete={() => remove(overall)} />
          ) : (
            <button
              onClick={() => setModal({ mode: "add", preset: { category_id: null, amount_limit: 0 } })}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-line bg-white/60 p-4 text-left transition hover:border-brand hover:bg-brand-soft/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Target size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Add an overall monthly budget</span>
                <span className="block text-xs text-muted">One limit for all your expenses of {formatMonth(month)}.</span>
              </span>
            </button>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="flex flex-wrap gap-2" role="status">
              {alerts.map((budget) => {
                const status = statusOf(budget);
                const Icon = status === "exceeded" ? CircleAlert : TriangleAlert;
                return (
                  <span key={budget.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${STATUS[status].chip}`}>
                    <Icon size={13} />
                    {budget.category_name ?? "Overall budget"}:{" "}
                    {status === "exceeded"
                      ? `${money(-Number(budget.remaining))} over`
                      : `${Math.round(Number(budget.percentage_used))}% used`}
                  </span>
                );
              })}
            </div>
          )}

          {/* Category budgets */}
          <section>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Category budgets</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categoryBudgets.map((budget) => (
                <CategoryBudgetCard
                  key={budget.id}
                  budget={budget}
                  onEdit={() => setModal({ mode: "edit", budget })}
                  onDelete={() => remove(budget)}
                />
              ))}
              <button
                onClick={() => setModal({ mode: "add" })}
                className="flex min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line bg-white/50 p-4 text-sm transition hover:border-brand hover:bg-brand-soft/40"
              >
                <Plus size={18} className="text-brand" />
                <span className="font-semibold text-ink">Add a category budget</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Spending without a limit */}
      {budgets && unbudgeted.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Spending without a budget</h2>
          <div className="flex flex-wrap gap-2">
            {unbudgeted.map((item) => {
              const Icon = categoryIcon(item.category);
              // Suggest a round limit a bit above what was spent
              const suggestion = Math.ceil((item.total * 1.1) / 50) * 50;
              return (
                <button
                  key={item.category_id}
                  onClick={() => setModal({ mode: "add", preset: { category_id: item.category_id, amount_limit: suggestion } })}
                  className="group flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-2 pr-3 text-xs transition hover:border-brand"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-ink/70">
                    <Icon size={14} />
                  </span>
                  <span className="text-left">
                    <span className="block font-semibold text-ink">{item.category}</span>
                    <span className="block text-muted">{money(item.total)} spent</span>
                  </span>
                  <span className="ml-1 font-semibold text-brand group-hover:underline">Set budget</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        open={!!modal}
        title={modal?.mode === "edit" ? "Edit budget" : "New budget"}
        description={formatMonth(month)}
        onClose={() => setModal(null)}
      >
        {modal && (
          <BudgetForm
            key={modal.mode === "edit" ? modal.budget.id : `add-${modal.preset?.category_id ?? "x"}`}
            month={month}
            categories={categories}
            takenCategoryIds={takenIds}
            hasOverall={!!overall}
            initial={
              modal.mode === "edit"
                ? { category_id: modal.budget.category_id, amount_limit: Number(modal.budget.amount_limit) }
                : undefined
            }
            preset={modal.mode === "add" && modal.preset?.amount_limit ? modal.preset : undefined}
            submitLabel={modal.mode === "edit" ? "Save changes" : "Create budget"}
            onSubmit={save}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </main>
  );
}

function OverallCard({
  budget,
  daysLeft,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  daysLeft: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { money } = useCurrency();
  const used = Number(budget.percentage_used);
  const remaining = Number(budget.remaining);
  const status = statusOf(budget);
  const perDay = daysLeft && remaining > 0 ? remaining / daysLeft : null;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-[#14382a] to-brand-dark p-5 text-white shadow-lg shadow-ink/10">
      <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-white/70">Overall monthly budget</p>
            <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {money(Number(budget.spent))}
              <span className="text-base font-medium text-white/60"> / {money(Number(budget.amount_limit))}</span>
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} aria-label="Edit overall budget" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <Pencil size={16} />
            </button>
            <button onClick={onDelete} aria-label="Delete overall budget" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full rounded-full transition-all duration-700 ${status === "ok" ? "bg-emerald-400" : status === "warning" ? "bg-amber-400" : "bg-rose-400"}`}
            style={{ width: `${Math.min(used, 100)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold">{Math.round(used)}% used</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">
            {remaining >= 0 ? `${money(remaining)} left` : `${money(-remaining)} over the limit`}
          </span>
          {perDay !== null && (
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-ink">
              ≈ {money(Math.floor(perDay))} per day for {daysLeft} day{daysLeft! > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryBudgetCard({ budget, onEdit, onDelete }: { budget: Budget; onEdit: () => void; onDelete: () => void }) {
  const { money } = useCurrency();
  const Icon = categoryIcon(budget.category_name);
  const status = statusOf(budget);
  const used = Number(budget.percentage_used);
  const remaining = Number(budget.remaining);

  return (
    <article className="group flex flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)] transition hover:shadow-md hover:shadow-slate-900/5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-ink/70">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">{budget.category_name}</h3>
          <p className="truncate text-xs text-muted">
            {money(Number(budget.spent))} of {money(Number(budget.amount_limit))}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[status].chip}`}>{Math.round(used)}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(used)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all duration-700 ${STATUS[status].bar}`} style={{ width: `${Math.min(used, 100)}%` }} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`text-xs ${status === "exceeded" ? "font-semibold text-rose-600" : "text-muted"}`}>
          {remaining >= 0 ? `${money(remaining)} left` : `${money(-remaining)} over`} · {STATUS[status].label}
        </span>
        <span className="flex">
          <button onClick={onEdit} aria-label={`Edit ${budget.category_name} budget`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} aria-label={`Delete ${budget.category_name} budget`} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </span>
      </div>
    </article>
  );
}
