"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Download,
  Flame,
  Plus,
  Receipt,
  ScanLine,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { transactionsExcel } from "@/lib/excelExport";
import { categoryIcon } from "@/lib/categoryIcons";
import { useCurrency } from "@/lib/currency";
import { currentMonthString, shortMonthName, formatDate, formatMonth, todayString } from "@/lib/format";
import { Category } from "@/types/receipts";
import { Transaction, TransactionInput, TransactionSummary, TransactionType } from "@/types/transactions";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import MonthPicker from "@/components/dashboard/MonthPicker";
import TransactionForm from "@/components/transactions/TransactionForm";
import CategoriesManager from "@/components/transactions/CategoriesManager";
import Hero from "@/components/ui/Hero";
import Amount from "@/components/ui/Amount";
import SpendingCalendar from "@/components/transactions/SpendingCalendar";
import { currentLanguage, LANGUAGES, t } from "@/lib/i18n";

type TypeFilter = "all" | TransactionType;

// First and last day of a "YYYY-MM" month
function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}


function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Monday of the week of a "YYYY-MM-DD" date
function weekStart(date: string) {
  const day = new Date(`${date}T00:00:00`);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return toDateString(day);
}

// "13 - 19 Oct" (or "29 Sep - 5 Oct")
function weekLabel(monday: string) {
  const start = new Date(`${monday}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()} - ${end.getDate()} ${shortMonthName(end.getMonth())}`
    : `${start.getDate()} ${shortMonthName(start.getMonth())} - ${end.getDate()} ${shortMonthName(end.getMonth())}`;
}

// t("Today"), t("Yesterday") or "Sat 17"
function shortDay(date: string) {
  const label = dayLabel(date);
  if (label === t("Today") || label === t("Yesterday")) return label;
  const day = new Date(`${date}T00:00:00`);
  return `${day.toLocaleDateString(LANGUAGES[currentLanguage()].locale, { weekday: "short" })} ${day.getDate()}`;
}

function dayLabel(date: string) {
  const today = todayString();
  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (date === today) return t("Today");
  if (date === yesterdayString) return t("Yesterday");
  return formatDate(date);
}

export default function TransactionsPage() {
  const { money } = useCurrency();
  const { toast, confirm } = useFeedback();

  const [month, setMonth] = useState(currentMonthString());
  const [allTime, setAllTime] = useState(false);
  const [type, setType] = useState<TypeFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"add" | "categories" | Transaction | null>(null);

  // Wait until the user stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadCategories = useCallback(async () => {
    setCategories(await api<Category[]>("/api/categories"));
  }, []);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    if (!allTime) {
      const { start, end } = monthRange(month);
      params.set("start_date", start);
      params.set("end_date", end);
    }
    if (type !== "all") params.set("type", type);
    if (categoryId) params.set("category_id", categoryId);
    if (search) params.set("search", search);

    try {
      const [list, totals] = await Promise.all([
        api<Transaction[]>(`/api/transactions?${params}`),
        api<TransactionSummary>(allTime ? "/api/transactions/summary" : `/api/transactions/summary?month=${month}`),
      ]);
      setTransactions(list);
      setSummary(totals);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [month, allTime, type, categoryId, search]);

  useEffect(() => {
    loadCategories().catch(() => toast.error(t("Could not load your categories.")));
  }, [loadCategories, toast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Group the list by week (Monday to Sunday), newest first (the API already sorts by date)
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of transactions ?? []) {
      const week = weekStart(transaction.date);
      map.set(week, [...(map.get(week) ?? []), transaction]);
    }
    return [...map.entries()];
  }, [transactions]);

  const filtered = type !== "all" || !!categoryId || !!search;
  const visibleCategories = categories.filter((c) => type === "all" || c.type === type);

  async function create(values: TransactionInput) {
    await api("/api/transactions", { method: "POST", body: JSON.stringify(values) });
    setModal(null);
    toast.success(t(values.type === "income" ? "Income of {amount} added." : "Expense of {amount} added.", { amount: money(Number(values.amount)) }));
    await loadTransactions();
  }

  async function update(id: number, values: TransactionInput) {
    await api(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(values) });
    setModal(null);
    toast.success(t("Transaction updated."));
    await loadTransactions();
  }

  async function remove(transaction: Transaction) {
    const ok = await confirm({
      title: "Delete this transaction?",
      message: `${transaction.merchant || transaction.category_name} · ${money(Number(transaction.amount))} on ${formatDate(transaction.date)}. Your budgets and dashboard will be updated.`,
      confirmLabel: t("Delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      setModal(null);
      toast.success(t("Transaction deleted."));
      await loadTransactions();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function clearFilters() {
    setType("all");
    setCategoryId("");
    setSearchInput("");
  }

  const income = Number(summary?.total_income ?? 0);
  const expenses = Number(summary?.total_expenses ?? 0);
  const balance = Number(summary?.balance ?? 0);
  const editing = modal && typeof modal === "object" ? modal : null;
  const periodLabel = allTime ? t("All time") : formatMonth(month);
  const spentShare = income > 0 ? Math.min((expenses / income) * 100, 100) : expenses > 0 ? 100 : 0;

  // Small facts about the visible list
  const insights = useMemo(() => {
    const list = (transactions ?? []).filter((tx) => tx.type === "expense");
    if (list.length === 0) return null;
    const biggest = list.reduce((max, tx) => (Number(tx.amount) > Number(max.amount) ? tx : max), list[0]);
    const byCategory = new Map<string, number>();
    const byStore = new Map<string, number>();
    for (const tx of list) {
      byCategory.set(tx.category_name, (byCategory.get(tx.category_name) ?? 0) + Number(tx.amount));
      if (tx.merchant) byStore.set(tx.merchant, (byStore.get(tx.merchant) ?? 0) + 1);
    }
    const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    const topStore = [...byStore.entries()].sort((a, b) => b[1] - a[1])[0];
    return { biggest, topCategory, topStore };
  }, [transactions]);

  const chip = (active: boolean) =>
    `flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-ink/30 hover:text-ink"
    }`;

  return (
    <main className="page">
      <PageHeader title={t("Transactions")} subtitle={t("Every income and expense you recorded.")}>
        {!allTime && <MonthPicker value={month} onChange={setMonth} compact />}
        <button
          onClick={() => setAllTime(!allTime)}
          aria-pressed={allTime}
          className={`h-8 shrink-0 rounded-xl border px-3 text-xs font-semibold transition ${
            allTime ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:text-ink"
          }`}
        >
          {t("All time")}
        </button>
        <Button size="xs" variant="secondary" onClick={() => setModal("categories")} aria-label={t("Manage categories")} title={t("Categories")}>
          <Settings2 size={14} />
        </Button>
        <Link
          href="/receipts"
          aria-label={t("Scan a receipt")}
          title={t("Scan a receipt")}
          className="inline-flex h-8 items-center rounded-xl border border-line bg-white px-2.5 text-ink transition hover:bg-background"
        >
          <ScanLine size={14} />
        </Link>
        <Button size="xs" onClick={() => setModal("add")} className="ms-auto sm:ms-0">
          <Plus size={14} />
          {t("Add")}
        </Button>
      </PageHeader>

      {/* Summary: one slim row (balance + 3 small insight tiles) */}
      <section className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <Hero compact className="col-span-3 lg:col-span-1">
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] text-white/75">{t("Balance")} · {periodLabel}</p>
              <p className="truncate">{summary ? <Amount value={balance} size="hero" className="!text-[24px]" /> : "..."}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-[11px]">
              <span className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-0.5" title={t("Income")}>
                <ArrowDownLeft size={12} />
                <span className="font-semibold">{summary ? money(income) : "..."}</span>
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-0.5" title={t("Expenses")}>
                <ArrowUpRight size={12} />
                <span className="font-semibold">{summary ? money(expenses) : "..."}</span>
              </span>
            </div>
          </div>
          <div className="relative mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="fill-in h-full rounded-full bg-white transition-all duration-700" style={{ width: `${spentShare}%` }} />
            </div>
            <span className="shrink-0 text-[10px] text-white/80">{income > 0 ? t("{percent}% spent", { percent: Math.round((expenses / income) * 100) }) : t("no income")}</span>
          </div>
        </Hero>

        {[
          {
            icon: Flame,
            color: "bg-rose-50 text-rose-500",
            label: t("Biggest expense"),
            value: insights ? money(Number(insights.biggest.amount)) : "-",
            hint: insights ? insights.biggest.merchant || t(insights.biggest.category_name) : "",
          },
          {
            icon: insights ? categoryIcon(insights.topCategory[0]) : ShoppingBag,
            color: "bg-amber-50 text-amber-600",
            label: t("Top category"),
            value: insights ? t(insights.topCategory[0]) : "-",
            hint: insights ? money(insights.topCategory[1]) : "",
          },
          {
            icon: Store,
            color: "bg-sky-50 text-sky-600",
            label: t("Most visited"),
            value: insights?.topStore ? insights.topStore[0] : "-",
            hint: insights?.topStore ? t(insights.topStore[1] > 1 ? "{count} times" : "{count} time", { count: insights.topStore[1] }) : "",
          },
        ].map(({ icon: Icon, color, label, value, hint }) => (
          <div key={label} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-line bg-white px-3 py-2.5">
            <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${color}`}>
              <Icon size={15} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] text-muted">{label}</span>
              <span className="block truncate text-xs font-bold text-ink">{value}</span>
              {hint && <span className="block truncate text-[10px] text-muted">{hint}</span>}
            </span>
          </div>
        ))}
      </section>

      {/* Spending calendar of the month (follows the filters) */}
      {!allTime && transactions && transactions.some((tx) => tx.type === "expense") && (
        <div className="mt-3">
          <SpendingCalendar month={month} transactions={transactions} />
        </div>
      )}

      {/* Filters: search, type, category chips */}
      <section className="mt-3 rounded-2xl border border-line bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search store or description")}
              aria-label={t("Search transactions")}
              maxLength={255}
              className="h-9 w-full rounded-xl border border-line bg-background/60 ps-9 pe-9 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                aria-label={t("Clear search")}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex rounded-xl bg-background p-1" role="radiogroup" aria-label={t("Type")}>
            {(["all", "income", "expense"] as const).map((value) => (
              <button
                key={value}
                role="radio"
                aria-checked={type === value}
                onClick={() => {
                  setType(value);
                  setCategoryId("");
                }}
                className={`h-7 flex-1 rounded-lg px-3 text-xs font-semibold transition ${
                  type === value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {value === "all" ? t("All") : value === "income" ? t("Income") : t("Expenses")}
              </button>
            ))}
          </div>
        </div>

        <div className="thin-scroll -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={t("Category")}>
          <button role="radio" aria-checked={!categoryId} onClick={() => setCategoryId("")} className={chip(!categoryId)}>
            {t("All categories")}
          </button>
          {visibleCategories.map((category) => {
            const Icon = categoryIcon(category.name);
            const active = categoryId === String(category.id);
            return (
              <button
                key={category.id}
                role="radio"
                aria-checked={active}
                onClick={() => setCategoryId(active ? "" : String(category.id))}
                className={chip(active)}
              >
                <Icon size={13} />
                {t(category.name)}
              </button>
            );
          })}
        </div>
      </section>

      {/* List */}
      <section className="mt-3">
        {error && !transactions && <ErrorState message={`${t("We couldn't load your transactions.")} ${error}`} onRetry={loadTransactions} />}

        {!transactions && !error && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        )}

        {transactions && transactions.length === 0 && (
          <EmptyState
            icon={ArrowLeftRight}
            illustration={filtered ? undefined : "wallet"}
            title={filtered ? t("No matching transactions") : t("No transactions yet")}
            text={
              filtered
                ? t("Try another search or remove some filters.")
                : allTime ? t("Nothing recorded yet. Add one or scan a receipt.") : t("Nothing recorded in {month}. Add one or scan a receipt.", { month: formatMonth(month) })
            }
            action={
              filtered ? (
                <Button variant="secondary" onClick={clearFilters}>
                  {t("Clear filters")}
                </Button>
              ) : (
                <Button onClick={() => setModal("add")}>
                  <Plus size={18} />
                  {t("Add a transaction")}
                </Button>
              )
            }
          />
        )}

        {transactions && transactions.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted">
              <span>
                {t(transactions.length > 1 ? "{count} transactions" : "{count} transaction", { count: transactions.length })}
                {filtered && (
                  <button onClick={clearFilters} className="ms-2 font-medium text-brand hover:underline">
                    {t("Clear filters")}
                  </button>
                )}
              </span>
              <button
                onClick={() =>
                  transactionsExcel(`smartwallet-transactions-${allTime ? "all" : month}.xlsx`, periodLabel, transactions).catch(() =>
                    toast.error(t("Could not create the Excel file."))
                  )
                }
                className="flex items-center gap-1 font-medium text-ink/70 hover:text-ink"
              >
                <Download size={13} />
                {t("Export Excel")}
              </button>
            </div>

            {/* Timeline: one marker per week, that week's transactions as a grid of cards */}
            <ol className="relative">
              <span className="absolute bottom-2 start-[7px] top-2 w-px bg-line sm:start-[103px]" aria-hidden="true" />
              {groups.map(([week, items]) => {
                const dayTotal = items.reduce((sum, tx) => sum + (tx.type === "income" ? 1 : -1) * Number(tx.amount), 0);
                const thisWeek = week === weekStart(todayString());
                return (
                  <li key={week} className="relative pb-5 ps-7 last:pb-0 sm:ps-[128px]">
                    {/* Day marker */}
                    <span className="absolute start-0 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-brand bg-white sm:start-[96px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    </span>
                    <div className="mb-2 flex items-baseline justify-between gap-3 sm:absolute sm:start-0 sm:top-0 sm:mb-0 sm:block sm:w-[84px] sm:text-end">
                      <span>
                        <span className="block text-sm font-bold leading-tight text-ink">{thisWeek ? t("This week") : weekLabel(week)}</span>
                        <span className="text-[11px] text-muted">
                          {thisWeek && `${weekLabel(week)} · `}
                          {t(items.length > 1 ? "{count} items" : "{count} item", { count: items.length })}
                        </span>
                      </span>
                      <span className={`block text-xs font-semibold sm:mt-1 ${dayTotal >= 0 ? "text-brand-dark" : "text-ink/60"}`}>
                        {dayTotal >= 0 ? "+" : "-"}
                        {money(Math.abs(dayTotal))}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((transaction) => {
                        const Icon = categoryIcon(transaction.category_name);
                        const isIncome = transaction.type === "income";
                        return (
                          <div
                            key={transaction.id}
                            className="group relative rounded-xl border border-line bg-white transition hover:border-ink/15 hover:shadow-sm"
                          >
                            <button
                              onClick={() => setModal(transaction)}
                              className="flex w-full items-center gap-3 p-3 text-start"
                              aria-label={`${t("Edit")} ${transaction.merchant || transaction.category_name}`}
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  isIncome ? "bg-brand-soft text-brand" : "bg-slate-100 text-ink/60"
                                }`}
                              >
                                <Icon size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">
                                  {transaction.merchant || transaction.description || t(transaction.category_name)}
                                </span>
                                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
                                  <span className="shrink-0 rounded bg-background px-1.5 font-semibold text-ink/70">
                                    {shortDay(transaction.date)}
                                  </span>
                                  <span className="truncate">{t(transaction.category_name)}</span>
                                  {transaction.receipt_id && (
                                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-50 px-1 text-[10px] font-medium text-sky-700">
                                      <Receipt size={9} /> {t("Receipt")}
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className={`shrink-0 text-sm font-bold tabular-nums ${isIncome ? "text-brand" : "text-ink"}`}>
                                <Amount value={Number(transaction.amount)} size="list" sign={isIncome ? "+" : "-"} />
                              </span>
                            </button>
                            {transaction.merchant && transaction.description && (
                              <p className="-mt-1.5 truncate px-3 pb-2.5 ps-[64px] text-[11px] text-muted">{transaction.description}</p>
                            )}
                            <button
                              onClick={() => remove(transaction)}
                              aria-label={t("Delete transaction")}
                              className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-muted shadow-sm transition hover:border-red-200 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <Modal open={modal === "add"} title={t("New transaction")} onClose={() => setModal(null)}>
        <TransactionForm categories={categories} submitLabel="Add transaction" onSubmit={create} onCancel={() => setModal(null)} />
      </Modal>

      <Modal open={!!editing} title={t("Edit transaction")} onClose={() => setModal(null)}>
        {editing && (
          <>
            <TransactionForm
              key={editing.id}
              categories={categories}
              initial={editing}
              submitLabel="Save changes"
              onSubmit={(values) => update(editing.id, values)}
              onCancel={() => setModal(null)}
            />
            <button
              onClick={() => remove(editing)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
              {t("Delete this transaction")}
            </button>
          </>
        )}
      </Modal>

      <Modal
        open={modal === "categories"}
        title={t("Categories")}
        description={t("Default categories are always there. Add your own for anything else.")}
        onClose={() => setModal(null)}
      >
        <CategoriesManager categories={categories} onChange={loadCategories} />
      </Modal>
    </main>
  );
}
