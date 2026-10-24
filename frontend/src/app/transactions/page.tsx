"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Download, Plus, Receipt, ScanLine, Search, Settings2, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { categoryIcon } from "@/lib/categoryIcons";
import { useCurrency } from "@/lib/currency";
import { currentMonthString, formatDate, formatMonth, todayString } from "@/lib/format";
import { Category } from "@/types/receipts";
import { Transaction, TransactionInput, TransactionSummary, TransactionType } from "@/types/transactions";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import MonthPicker from "@/components/dashboard/MonthPicker";
import TransactionForm from "@/components/transactions/TransactionForm";
import CategoriesManager from "@/components/transactions/CategoriesManager";

type TypeFilter = "all" | TransactionType;

// First and last day of a "YYYY-MM" month
function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function dayLabel(date: string) {
  const today = todayString();
  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (date === today) return "Today";
  if (date === yesterdayString) return "Yesterday";
  return formatDate(date);
}

// Downloads the visible transactions as a CSV file (amounts in MAD, as stored)
function exportCsv(rows: Transaction[], fileName: string) {
  const escape = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    "date,type,category,merchant,description,amount_mad",
    ...rows.map((t) => [t.date, t.type, escape(t.category_name), escape(t.merchant), escape(t.description), t.amount].join(",")),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
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
    loadCategories().catch(() => toast.error("Could not load your categories."));
  }, [loadCategories, toast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Group the list by day, newest first (the API already sorts by date)
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of transactions ?? []) {
      map.set(transaction.date, [...(map.get(transaction.date) ?? []), transaction]);
    }
    return [...map.entries()];
  }, [transactions]);

  const filtered = type !== "all" || !!categoryId || !!search;
  const visibleCategories = categories.filter((c) => type === "all" || c.type === type);

  async function create(values: TransactionInput) {
    await api("/api/transactions", { method: "POST", body: JSON.stringify(values) });
    setModal(null);
    toast.success(`${values.type === "income" ? "Income" : "Expense"} of ${money(Number(values.amount))} added.`);
    await loadTransactions();
  }

  async function update(id: number, values: TransactionInput) {
    await api(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(values) });
    setModal(null);
    toast.success("Transaction updated.");
    await loadTransactions();
  }

  async function remove(transaction: Transaction) {
    const ok = await confirm({
      title: "Delete this transaction?",
      message: `${transaction.merchant || transaction.category_name} · ${money(Number(transaction.amount))} on ${formatDate(transaction.date)}. Your budgets and dashboard will be updated.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      setModal(null);
      toast.success("Transaction deleted.");
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

  return (
    <main className="page">
      <PageHeader title="Transactions" subtitle="Every income and expense you recorded.">
        <Button variant="secondary" size="sm" onClick={() => setModal("categories")} aria-label="Manage categories">
          <Settings2 size={15} />
          <span className="hidden sm:inline">Categories</span>
        </Button>
        <Link
          href="/receipts"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink transition hover:bg-background"
        >
          <ScanLine size={15} />
          <span className="hidden sm:inline">Scan</span>
        </Link>
        <Button size="sm" onClick={() => setModal("add")} className="ml-auto sm:ml-0">
          <Plus size={16} />
          Add
        </Button>
      </PageHeader>

      {/* Period + totals */}
      <section className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-wrap items-center gap-2">
          {!allTime && <MonthPicker value={month} onChange={setMonth} />}
          <button
            onClick={() => setAllTime(!allTime)}
            aria-pressed={allTime}
            className={`h-10 rounded-xl border px-3 text-sm font-medium transition ${
              allTime ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:text-ink"
            }`}
          >
            All time
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Income", money(income), "text-brand-dark", "bg-brand-soft/70"],
            ["Expenses", money(expenses), "text-rose-600", "bg-rose-50"],
            ["Balance", money(balance), balance >= 0 ? "text-ink" : "text-rose-600", "bg-white border border-line"],
          ].map(([label, value, color, bg]) => (
            <div key={label} className={`rounded-xl px-3 py-2 ${bg}`}>
              <p className="truncate text-[11px] text-muted">
                {label}
                <span className="hidden sm:inline"> · {allTime ? "all time" : formatMonth(month)}</span>
              </p>
              <p className={`truncate text-sm font-bold sm:text-base ${color}`}>{summary ? value : "..."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="mt-3 flex flex-col gap-2 rounded-2xl border border-line bg-white p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search store or description"
            aria-label="Search transactions"
            maxLength={255}
            className="h-10 w-full rounded-xl border border-line bg-background/60 pl-9 pr-9 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl bg-background p-1" role="radiogroup" aria-label="Type">
            {(["all", "income", "expense"] as const).map((value) => (
              <button
                key={value}
                role="radio"
                aria-checked={type === value}
                onClick={() => {
                  setType(value);
                  setCategoryId("");
                }}
                className={`h-8 rounded-lg px-3 text-xs font-semibold capitalize transition ${
                  type === value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {value === "all" ? "All" : value === "income" ? "Income" : "Expenses"}
              </button>
            ))}
          </div>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Category"
            className="min-w-0 flex-1 md:w-48 md:flex-none [&_select]:h-10"
          >
            <option value="">All categories</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {/* List */}
      <section className="mt-4">
        {error && !transactions && <ErrorState message={`We couldn't load your transactions. ${error}`} onRetry={loadTransactions} />}

        {!transactions && !error && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}

        {transactions && transactions.length === 0 && (
          <EmptyState
            icon={ArrowLeftRight}
            title={filtered ? "No matching transactions" : "No transactions yet"}
            text={
              filtered
                ? "Try another search or remove some filters."
                : `Nothing recorded ${allTime ? "yet" : `in ${formatMonth(month)}`}. Add one or scan a receipt.`
            }
            action={
              filtered ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setModal("add")}>
                  <Plus size={18} />
                  Add a transaction
                </Button>
              )
            }
          />
        )}

        {transactions && transactions.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>
                {transactions.length} transaction{transactions.length > 1 ? "s" : ""}
                {filtered && (
                  <button onClick={clearFilters} className="ml-2 font-medium text-brand hover:underline">
                    Clear filters
                  </button>
                )}
              </span>
              <button
                onClick={() => exportCsv(transactions, `smartwallet-${allTime ? "all" : month}.csv`)}
                className="flex items-center gap-1 font-medium text-ink/70 hover:text-ink"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>

            <div className="space-y-4">
              {groups.map(([date, items]) => {
                const dayTotal = items.reduce((sum, t) => sum + (t.type === "income" ? 1 : -1) * Number(t.amount), 0);
                return (
                  <div key={date}>
                    <div className="mb-1.5 flex items-center justify-between px-1 text-xs">
                      <span className="font-semibold text-ink">{dayLabel(date)}</span>
                      <span className={dayTotal >= 0 ? "text-brand-dark" : "text-muted"}>
                        {dayTotal >= 0 ? "+" : "-"}
                        {money(Math.abs(dayTotal))}
                      </span>
                    </div>
                    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                      {items.map((transaction) => {
                        const Icon = categoryIcon(transaction.category_name);
                        const isIncome = transaction.type === "income";
                        return (
                          <li key={transaction.id} className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-background/70">
                            <button
                              onClick={() => setModal(transaction)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              aria-label={`Edit ${transaction.merchant || transaction.category_name}`}
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  isIncome ? "bg-brand-soft text-brand" : "bg-slate-100 text-ink/70"
                                }`}
                              >
                                <Icon size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-ink">
                                  {transaction.merchant || transaction.description || transaction.category_name}
                                </span>
                                <span className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                                  {transaction.category_name}
                                  {transaction.merchant && transaction.description && ` · ${transaction.description}`}
                                  {transaction.receipt_id && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 text-[10px] font-medium text-sky-700">
                                      <Receipt size={10} /> Receipt
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className={`shrink-0 text-sm font-bold ${isIncome ? "text-brand" : "text-ink"}`}>
                                {isIncome ? "+" : "-"}
                                {money(Number(transaction.amount))}
                              </span>
                            </button>
                            <button
                              onClick={() => remove(transaction)}
                              aria-label="Delete transaction"
                              className="rounded-lg p-1.5 text-muted opacity-100 transition hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                            >
                              <Trash2 size={15} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Modal open={modal === "add"} title="New transaction" onClose={() => setModal(null)}>
        <TransactionForm categories={categories} submitLabel="Add transaction" onSubmit={create} onCancel={() => setModal(null)} />
      </Modal>

      <Modal open={!!editing} title="Edit transaction" onClose={() => setModal(null)}>
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
              Delete this transaction
            </button>
          </>
        )}
      </Modal>

      <Modal
        open={modal === "categories"}
        title="Categories"
        description="Default categories are always there. Add your own for anything else."
        onClose={() => setModal(null)}
      >
        <CategoriesManager categories={categories} onChange={loadCategories} />
      </Modal>
    </main>
  );
}
