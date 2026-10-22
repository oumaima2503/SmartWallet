import { SavingsGoal } from "./savings";

export type BudgetUsage = {
  id: number;
  category_id: number | null;
  category: string;
  is_overall: boolean;
  amount_limit: number;
  spent: number;
  remaining: number;
  percent_used: number;
  status: "ok" | "warning" | "exceeded";
};

export type RecentTransaction = {
  id: number;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string | null;
  merchant: string | null;
  category: string;
};

export type DashboardData = {
  month: string;
  user: { name: string; currency: string } | null;
  totals: {
    income: number;
    expenses: number;
    balance: number;
    income_change_percent: number | null;
    expenses_change_percent: number | null;
  };
  spending_by_category: { category_id: number; category: string; total: number; percent: number }[];
  monthly_trend: { month: string; income: number; expenses: number }[];
  budgets: { overall: BudgetUsage | null; categories: BudgetUsage[] };
  recent_transactions: RecentTransaction[];
  savings: {
    saved_this_month: number;
    total_saved: number;
    total_target: number;
    goals: SavingsGoal[];
  };
};
