"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import BalanceCard from "@/components/dashboard/BalanceCard";
import KpiCard from "@/components/dashboard/KpiCard";
import { api, peekCache } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { t, useT } from "@/lib/i18n";
import { currentMonthString, formatMonth } from "@/lib/format";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { DashboardData } from "@/types/dashboard";
import MonthPicker from "@/components/dashboard/MonthPicker";
import ExpensesChart from "@/components/dashboard/ExpensesChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import BudgetUsageCard from "@/components/dashboard/BudgetUsageCard";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import GoalsProgress from "@/components/dashboard/GoalsProgress";
import AiInsights from "@/components/dashboard/AiInsights";
import Amount from "@/components/ui/Amount";
import GettingStarted from "@/components/dashboard/GettingStarted";

function DashboardSkeleton() {
  return (
    <div aria-label={t("Loading dashboard")} className="mt-3 space-y-4">
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
  const [month, setMonth] = useState(currentMonthString());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const path = `/api/dashboard?month=${month}`;
      // Show the last known numbers at once, then the fresh ones
      const cached = peekCache<DashboardData>(path);
      if (cached) setData(cached.data);
      setData(await api<DashboardData>(path));
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
  const { t } = useT();
  const name = data?.user?.name;
  const trend = data?.monthly_trend ?? [];

  return (
    <main className="page">
      {/* The greeting lives in the top bar: here only a small month selector */}
      <div className="flex items-center justify-between gap-3">
        {/* Phones have no greeting in the top bar */}
        <p className="truncate text-sm text-muted lg:hidden">{name ? `${t("Hi {name}", { name: name.split(" ")[0] })} 👋` : ""}</p>
        <div className="ms-auto" data-tour="dash-month">
          <MonthPicker value={month} onChange={setMonth} compact />
        </div>
      </div>

      {error && !data && (
        <div className="mt-6">
          <ErrorState message={`${t("We couldn't load your dashboard.")} ${error}`} onRetry={loadDashboard} />
        </div>
      )}

      {!data && !error && <DashboardSkeleton />}

      {data && data.totals.income === 0 && data.totals.expenses === 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{t("No transactions recorded for {month} yet.", { month: formatMonth(data.month) })}</span>
          <Link href="/receipts" className="font-semibold underline-offset-2 hover:underline">
            {t("Scan a receipt")}
          </Link>
        </div>
      )}

      {data && (
        <div className="mt-3 space-y-4">
          <GettingStarted data={data} />

          {/* Key numbers */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" data-tour="dash-kpis">
            <div className="col-span-2 xl:col-span-1">
              <BalanceCard
                income={data.totals.income}
                expenses={data.totals.expenses}
                balance={data.totals.balance}
                trend={trend.map((row) => row.income - row.expenses)}
              />
            </div>
            <KpiCard
              label={t("Income")}
              value={<Amount value={data.totals.income} />}
              icon={TrendingUp}
              tone="blue"
              change={data.totals.income_change_percent}
              trend={trend.map((row) => row.income)}
              footer={data.totals.income_change_percent !== null ? t("vs last month") : t("No data last month")}
            />
            <KpiCard
              label={t("Expenses")}
              value={<Amount value={data.totals.expenses} />}
              icon={TrendingDown}
              tone="red"
              change={data.totals.expenses_change_percent}
              lowerIsBetter
              trend={trend.map((row) => row.expenses)}
              footer={data.totals.expenses_change_percent !== null ? t("vs last month") : t("No data last month")}
            />
            <KpiCard
              label={t("Saved to goals")}
              value={<Amount value={data.savings.saved_this_month} />}
              icon={PiggyBank}
              tone="violet"
              footer={t("{amount} saved in total", { amount: money(data.savings.total_saved) })}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 xl:grid-cols-12" data-tour="dash-charts">
            <div className="min-w-0 xl:col-span-7">
              <ExpensesChart trend={data.monthly_trend} selectedMonth={data.month} onSelectMonth={setMonth} />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <CategoryDonut categories={data.spending_by_category} total={data.totals.expenses} />
            </div>
          </div>

          <div data-tour="dash-ai">
            <AiInsights month={data.month} />
          </div>

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
