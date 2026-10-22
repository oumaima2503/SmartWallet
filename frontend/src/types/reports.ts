export type BudgetStat = {
  category: string;
  is_overall: boolean;
  limit: number;
  spent: number;
  remaining: number;
  percent_used: number;
  status: "ok" | "warning" | "exceeded";
};

export type ReportStatistics = {
  month: string;
  currency: string;
  totals: {
    income: number;
    expenses: number;
    net: number;
    unspent_income_percent: number | null;
    transaction_count: number;
    expense_count: number;
    saved_to_goals: number;
  };
  categories: {
    category: string;
    total: number;
    percent_of_expenses: number;
    transaction_count: number;
    previous_month_total: number | null;
    change_amount: number | null;
    change_percent: number | null;
  }[];
  top_categories: string[];
  budgets: { overall: BudgetStat | null; categories: BudgetStat[] };
  history: {
    has_previous_month: boolean;
    months_with_data: number;
    previous_month: { month: string; income: number; expenses: number; change_amount: number; change_percent: number | null } | null;
    average_expenses_previous_months: number | null;
  };
  savings_goals: { name: string; target: number; saved: number; progress_percent: number; contributed_this_month: number }[];
  data_notes: string[];
};

export type Insight = { title: string; detail: string; evidence: string };

export type ReportAnalysis = {
  overview: string;
  spending_patterns: Insight[];
  budget_concerns: { category: string; detail: string; evidence: string }[];
  positive_observations: Insight[];
  recommendations: { action: string; reason: string; evidence: string }[];
  history_note: string | null;
};

export type Report = {
  id: number;
  month: string;
  statistics: ReportStatistics;
  analysis: ReportAnalysis;
  created_at: string;
};

export type ReportSummary = { id: number; month: string; created_at: string; income: number; expenses: number };
