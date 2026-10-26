import { pool } from "../db";
import { getRates, SUPPORTED_CURRENCIES, Currency } from "./exchangeRates";

// Everything the assistant may know about the user, calculated here from the user's own rows.
// The AI never queries the database: it only reads this summary.
// Amounts are converted to the user's display currency so the answers match what the app shows.

const HISTORY_MONTHS = 6;
const RECENT_TRANSACTIONS = 25;
// Category detail for the last 3 months only (keeps each question small for the AI quota)
const CATEGORY_MONTHS = 3;

export async function buildChatContext(userId: number) {
  const [user, monthly, byCategory, budgets, goals, recent, merchants] = await Promise.all([
    pool.query("SELECT name, currency FROM users WHERE id = $1", [userId]),
    // Income / expenses per month (last 6 months, current one included)
    pool.query(
      `SELECT to_char(m, 'YYYY-MM') AS month,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0)::float AS income,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0)::float AS expenses
       FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '${HISTORY_MONTHS - 1} months', date_trunc('month', CURRENT_DATE), INTERVAL '1 month') m
       LEFT JOIN transactions t ON t.user_id = $1 AND t.date >= m AND t.date < m + INTERVAL '1 month'
       GROUP BY m ORDER BY m`,
      [userId]
    ),
    // Spending per category per month
    pool.query(
      `SELECT to_char(date_trunc('month', t.date), 'YYYY-MM') AS month, c.name AS category,
         SUM(t.amount)::float AS total
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense'
         AND t.date >= date_trunc('month', CURRENT_DATE) - INTERVAL '${CATEGORY_MONTHS - 1} months'
       GROUP BY 1, 2 ORDER BY 1, total DESC`,
      [userId]
    ),
    // This month's budgets with what is already spent
    pool.query(
      `SELECT COALESCE(c.name, 'Overall') AS category, b.amount_limit::float AS limit,
         COALESCE((SELECT SUM(t.amount) FROM transactions t
           WHERE t.user_id = b.user_id AND t.type = 'expense'
             AND t.date >= b.month AND t.date < b.month + INTERVAL '1 month'
             AND (b.category_id IS NULL OR t.category_id = b.category_id)), 0)::float AS spent
       FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = date_trunc('month', CURRENT_DATE)::date
       ORDER BY b.category_id NULLS FIRST`,
      [userId]
    ),
    pool.query(
      `SELECT g.name, g.target_amount::float AS target, to_char(g.target_date, 'YYYY-MM-DD') AS target_date,
         g.is_completed, COALESCE(SUM(sc.amount), 0)::float AS saved
       FROM savings_goals g LEFT JOIN savings_contributions sc ON sc.goal_id = g.id
       WHERE g.user_id = $1 GROUP BY g.id ORDER BY g.created_at`,
      [userId]
    ),
    pool.query(
      `SELECT to_char(t.date, 'YYYY-MM-DD') AS date, t.type, t.amount::float AS amount, c.name AS category,
         t.merchant, t.description
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 ORDER BY t.date DESC, t.id DESC LIMIT ${RECENT_TRANSACTIONS}`,
      [userId]
    ),
    pool.query(
      `SELECT merchant, COUNT(*)::int AS visits, SUM(amount)::float AS total
       FROM transactions
       WHERE user_id = $1 AND type = 'expense' AND merchant IS NOT NULL
         AND date >= CURRENT_DATE - INTERVAL '3 months'
       GROUP BY merchant ORDER BY total DESC LIMIT 8`,
      [userId]
    ),
  ]);

  const stored = user.rows[0]?.currency;
  const currency: Currency = SUPPORTED_CURRENCIES.includes(stored) ? stored : "MAD";
  const rate = currency === "MAD" ? 1 : (await getRates()).rates[currency];
  const money = (value: number) => Math.round(value * rate * 100) / 100;

  return {
    today: new Date().toISOString().slice(0, 10),
    user_name: user.rows[0]?.name ?? "",
    currency,
    months: monthly.rows.map((row) => ({
      month: row.month,
      income: money(row.income),
      expenses: money(row.expenses),
      balance: money(row.income - row.expenses),
    })),
    spending_by_category: byCategory.rows.map((row) => ({ month: row.month, category: row.category, total: money(row.total) })),
    budgets_this_month: budgets.rows.map((row) => ({
      category: row.category,
      limit: money(row.limit),
      spent: money(row.spent),
      remaining: money(row.limit - row.spent),
      percent_used: row.limit > 0 ? Math.round((row.spent / row.limit) * 1000) / 10 : null,
    })),
    savings_goals: goals.rows.map((row) => ({
      name: row.name,
      target: money(row.target),
      saved: money(row.saved),
      remaining: money(Math.max(row.target - row.saved, 0)),
      target_date: row.target_date,
      completed: row.is_completed,
    })),
    // Empty fields are left out to keep the summary short
    recent_transactions: recent.rows.map((row) => ({
      date: row.date,
      type: row.type,
      amount: money(row.amount),
      category: row.category,
      ...(row.merchant ? { merchant: row.merchant } : {}),
      ...(row.description ? { description: row.description } : {}),
    })),
    top_merchants_last_3_months: merchants.rows.map((row) => ({ ...row, total: money(row.total) })),
  };
}
