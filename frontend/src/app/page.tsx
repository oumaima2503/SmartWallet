"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import BalanceCard from "@/components/dashboard/BalanceCard";
import KpiCard from "@/components/dashboard/KpiCard";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { currentMonthString, formatMonth } from "@/lib/format";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { DashboardData } from "@/types/dashboard";
import PageHeader from "@/components/layout/PageHeader";
import MonthPicker from "@/components/dashboard/MonthPicker";
import ExpensesChart from "@/components/dashboard/ExpensesChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import BudgetUsageCard from "@/components/dashboard/BudgetUsageCard";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import GoalsProgress from "@/components/dashboard/GoalsProgress";
import AiInsights from "@/components/dashboard/AiInsights";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div aria-label="Loading dashboard" className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={`h-28 rounded-2xl ${i === 1 ? "col-span-2 xl:col-span-1" : ""}`} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-72 rounded-2xl xl:col-span-7" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-5" />
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Computed in the browser only: the server clock can be in another time zone (hydration mismatch)
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);
  const [month, setMonth] = useState(currentMonthString());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setData(await api<DashboardData>(`/api/dashboard?month=${month}`));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [month]);

  useEffect(() => {
    loadDashboard();
    // Refresh when coming back to the tab, so changes made elsewhere show up
    window.addEventListener("focus", loadDashboard);
    return () => window.removeEventListener("focus", loadDashboard);
  }, [loadDashboard]);

  const { money } = useCurrency();
  const name = data?.user?.name;
  const trend = data?.monthly_trend ?? [];

  return (
    <main className="page">
      <PageHeader title={`${hello}${name ? `, ${name}` : ""}`} subtitle="Here is your financial overview.">
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>

      {error && !data && (
        <div className="mt-6">
          <ErrorState message={`We couldn't load your dashboard. ${error}`} onRetry={loadDashboard} />
        </div>
      )}

      {!data && !error && <DashboardSkeleton />}

      {data && data.totals.income === 0 && data.totals.expenses === 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>No transactions recorded for {formatMonth(data.month)} yet.</span>
          <Link href="/receipts" className="font-semibold underline-offset-2 hover:underline">
            Scan a receipt
          </Link>
        </div>
      )}

      {data && (
        <div className="mt-5 space-y-4">
          {/* Key numbers */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="col-span-2 xl:col-span-1">
              <BalanceCard
                income={data.totals.income}
                expenses={data.totals.expenses}
                balance={data.totals.balance}
                trend={trend.map((row) => row.income - row.expenses)}
              />
            </div>
            <KpiCard
              label="Income"
              value={money(data.totals.income)}
              icon={TrendingUp}
              tone="blue"
              change={data.totals.income_change_percent}
              trend={trend.map((row) => row.income)}
              footer={data.totals.income_change_percent !== null ? "vs last month" : "No data last month"}
            />
            <KpiCard
              label="Expenses"
              value={money(data.totals.expenses)}
              icon={TrendingDown}
              tone="red"
              change={data.totals.expenses_change_percent}
              lowerIsBetter
              trend={trend.map((row) => row.expenses)}
              footer={data.totals.expenses_change_percent !== null ? "vs last month" : "No data last month"}
            />
            <KpiCard
              label="Saved to goals"
              value={money(data.savings.saved_this_month)}
              icon={PiggyBank}
              tone="violet"
              footer={`${money(data.savings.total_saved)} saved in total`}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <ExpensesChart trend={data.monthly_trend} selectedMonth={data.month} onSelectMonth={setMonth} />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <CategoryDonut categories={data.spending_by_category} total={data.totals.expenses} />
            </div>
          </div>

          <AiInsights month={data.month} />

          {/* Details */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RecentTransactions transactions={data.recent_transactions} />
            <BudgetUsageCard budgets={data.budgets} />
            <div className="md:col-span-2 xl:col-span-1">
              <GoalsProgress savings={data.savings} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
