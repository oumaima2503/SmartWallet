import { Request, Response } from "express";
import { pool } from "../db";
import { fetchGoals } from "./savingsGoalsController";

const TREND_MONTHS = 6;
const RECENT_LIMIT = 12;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

// Percentage change from the previous value, or null when there is nothing to compare with
function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Income and expenses of the 6 months ending with monthStart (months without data count as 0)
function trendQuery(userId: number, monthStart: string) {
  return pool.query(
    `SELECT to_char(m, 'YYYY-MM') AS month,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0)::float AS income,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0)::float AS expenses
     FROM generate_series($2::date - INTERVAL '${TREND_MONTHS - 1} months', $2::date, INTERVAL '1 month') AS m
     LEFT JOIN transactions t ON t.user_id = $1 AND t.date >= m AND t.date < m + INTERVAL '1 month'
     GROUP BY m ORDER BY m`,
    [userId, monthStart]
  );
}

// GET /api/dashboard/trend?end=YYYY-MM - the 6 months ending with "end", to browse older months in the chart
export async function getTrend(req: Request, res: Response) {
  const end = typeof req.query.end === "string" ? req.query.end : currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(end)) {
    return res.status(400).json({ error: "Month must use the format YYYY-MM" });
  }
  if (end > currentMonth()) return res.status(400).json({ error: "You can't view future months" });
  const result = await trendQuery(req.userId!, `${end}-01`);
  res.json(result.rows);
}

// GET /api/dashboard?month=YYYY-MM (defaults to the current month)
// All numbers are calculated here from recorded transactions.
export async function getDashboard(req: Request, res: Response) {
  const month = typeof req.query.month === "string" ? req.query.month : currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ error: "Month must use the format YYYY-MM" });
  }

  const userId = req.userId!;
  const monthStart = `${month}-01`;
  // $2 is always the first day of the selected month
  const IN_MONTH = "t.date >= $2::date AND t.date < $2::date + INTERVAL '1 month'";
  const IN_PREVIOUS_MONTH = "t.date >= $2::date - INTERVAL '1 month' AND t.date < $2::date";

  const [user, totals, categories, trend, budgets, recent, savedThisMonth, goals] = await Promise.all([
    pool.query("SELECT name, currency FROM users WHERE id = $1", [userId]),

    pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND ${IN_MONTH}), 0)::float AS income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND ${IN_MONTH}), 0)::float AS expenses,
         COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND ${IN_PREVIOUS_MONTH}), 0)::float AS previous_income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND ${IN_PREVIOUS_MONTH}), 0)::float AS previous_expenses
       FROM transactions t WHERE t.user_id = $1`,
      [userId, monthStart]
    ),

    pool.query(
      `SELECT c.id, c.name, SUM(t.amount)::float AS total
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense' AND ${IN_MONTH}
       GROUP BY c.id, c.name ORDER BY total DESC`,
      [userId, monthStart]
    ),

    trendQuery(userId, monthStart),

    // The overall budget (no category) counts every expense; a category budget only its category
    pool.query(
      `SELECT b.id, b.category_id, c.name AS category, b.amount_limit::float AS amount_limit,
         COALESCE((
           SELECT SUM(t.amount) FROM transactions t
           WHERE t.user_id = b.user_id AND t.type = 'expense' AND ${IN_MONTH}
             AND (b.category_id IS NULL OR t.category_id = b.category_id)
         ), 0)::float AS spent
       FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2::date
       ORDER BY b.category_id NULLS FIRST, c.name`,
      [userId, monthStart]
    ),

    pool.query(
      `SELECT t.id, t.type, t.amount::float AS amount, to_char(t.date, 'YYYY-MM-DD') AS date,
         t.description, t.merchant, c.name AS category
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND ${IN_MONTH}
       ORDER BY t.date DESC, t.id DESC LIMIT ${RECENT_LIMIT}`,
      [userId, monthStart]
    ),

    pool.query(
      `SELECT COALESCE(SUM(c.amount), 0)::float AS total
       FROM savings_contributions c JOIN savings_goals g ON g.id = c.goal_id
       WHERE g.user_id = $1 AND c.date >= $2::date AND c.date < $2::date + INTERVAL '1 month'`,
      [userId, monthStart]
    ),

    fetchGoals(userId),
  ]);

  const t = totals.rows[0];
  const totalExpenses = t.expenses;

  const budgetRows = budgets.rows.map((budget) => {
    const percent = Math.round((budget.spent / budget.amount_limit) * 1000) / 10;
    return {
      id: budget.id,
      category_id: budget.category_id,
      category: budget.category ?? "Overall budget",
      is_overall: budget.category_id === null,
      amount_limit: budget.amount_limit,
      spent: round(budget.spent),
      remaining: round(Math.max(budget.amount_limit - budget.spent, 0)),
      percent_used: percent,
      status: percent > 100 ? "exceeded" : percent >= 80 ? "warning" : "ok",
    };
  });

  res.json({
    month,
    user: user.rows[0] ?? null,
    totals: {
      income: round(t.income),
      expenses: round(totalExpenses),
      // Balance = income - expenses. Savings contributions are not expenses, so they are not subtracted.
      balance: round(t.income - totalExpenses),
      income_change_percent: percentChange(t.income, t.previous_income),
      expenses_change_percent: percentChange(totalExpenses, t.previous_expenses),
    },
    spending_by_category: categories.rows.map((category) => ({
      category_id: category.id,
      category: category.name,
      total: round(category.total),
      percent: totalExpenses > 0 ? Math.round((category.total / totalExpenses) * 1000) / 10 : 0,
    })),
    monthly_trend: trend.rows.map((row) => ({ month: row.month, income: round(row.income), expenses: round(row.expenses) })),
    budgets: {
      overall: budgetRows.find((budget) => budget.is_overall) ?? null,
      categories: budgetRows.filter((budget) => !budget.is_overall),
    },
    recent_transactions: recent.rows,
    savings: {
      saved_this_month: round(savedThisMonth.rows[0].total),
      total_saved: round(goals.reduce((sum, goal) => sum + goal.saved_amount, 0)),
      total_target: round(goals.reduce((sum, goal) => sum + goal.target_amount, 0)),
      goals: goals.slice(0, 3),
    },
  });
}
