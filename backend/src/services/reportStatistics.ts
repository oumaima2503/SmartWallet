import { pool } from "../db";

// Every number in a monthly report is calculated here, from recorded data.
// The AI only receives these statistics and explains them.

const HISTORY_MONTHS = 3;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null;
}

function change(current: number, previous: number) {
  return {
    change_amount: round(current - previous),
    change_percent: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  };
}

function budgetStatus(percentUsed: number) {
  return percentUsed > 100 ? "exceeded" : percentUsed >= 80 ? "warning" : "ok";
}

export type MonthlyStatistics = Awaited<ReturnType<typeof buildMonthlyStatistics>>;

// month = "YYYY-MM". Returns null when nothing was recorded that month.
export async function buildMonthlyStatistics(userId: number, month: string) {
  const start = `${month}-01`;
  const IN_MONTH = "t.date >= $2::date AND t.date < $2::date + INTERVAL '1 month'";
  const IN_PREVIOUS = "t.date >= $2::date - INTERVAL '1 month' AND t.date < $2::date";

  const [user, totals, categories, history, budgets, goals] = await Promise.all([
    pool.query("SELECT currency FROM users WHERE id = $1", [userId]),

    pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::float AS income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::float AS expenses,
         COUNT(*)::int AS transaction_count,
         COUNT(*) FILTER (WHERE type = 'expense')::int AS expense_count
       FROM transactions t WHERE t.user_id = $1 AND ${IN_MONTH}`,
      [userId, start]
    ),

    pool.query(
      `SELECT c.name AS category,
         COALESCE(SUM(t.amount) FILTER (WHERE ${IN_MONTH}), 0)::float AS total,
         COUNT(*) FILTER (WHERE ${IN_MONTH})::int AS transaction_count,
         COALESCE(SUM(t.amount) FILTER (WHERE ${IN_PREVIOUS}), 0)::float AS previous_total
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense'
         AND t.date >= $2::date - INTERVAL '1 month' AND t.date < $2::date + INTERVAL '1 month'
       GROUP BY c.name`,
      [userId, start]
    ),

    // Totals of the months before, to know how much history exists
    pool.query(
      `SELECT to_char(date_trunc('month', t.date), 'YYYY-MM') AS month,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0)::float AS income,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0)::float AS expenses
       FROM transactions t
       WHERE t.user_id = $1 AND t.date >= $2::date - INTERVAL '${HISTORY_MONTHS} months' AND t.date < $2::date
       GROUP BY 1 ORDER BY 1 DESC`,
      [userId, start]
    ),

    pool.query(
      `SELECT c.name AS category, b.category_id, b.amount_limit::float AS amount_limit,
         COALESCE((
           SELECT SUM(t.amount) FROM transactions t
           WHERE t.user_id = b.user_id AND t.type = 'expense' AND ${IN_MONTH}
             AND (b.category_id IS NULL OR t.category_id = b.category_id)
         ), 0)::float AS spent
       FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2::date
       ORDER BY b.category_id NULLS FIRST, c.name`,
      [userId, start]
    ),

    pool.query(
      `SELECT g.name, g.target_amount::float AS target_amount, g.is_completed,
         COALESCE(SUM(c.amount) FILTER (WHERE c.date < $2::date + INTERVAL '1 month'), 0)::float AS saved,
         COALESCE(SUM(c.amount) FILTER (WHERE c.date >= $2::date AND c.date < $2::date + INTERVAL '1 month'), 0)::float AS contributed_this_month
       FROM savings_goals g LEFT JOIN savings_contributions c ON c.goal_id = g.id
       WHERE g.user_id = $1 GROUP BY g.id ORDER BY g.created_at`,
      [userId, start]
    ),
  ]);

  const t = totals.rows[0];
  if (t.transaction_count === 0) return null;

  const expenses = t.expenses;
  const previous = history.rows.find((row) => row.month === previousMonth(month));
  const hasPreviousMonth = !!previous && previous.expenses > 0;

  const categoryStats = categories.rows
    .filter((row) => row.total > 0 || row.previous_total > 0)
    .map((row) => ({
      category: row.category,
      total: round(row.total),
      percent_of_expenses: percent(row.total, expenses) ?? 0,
      transaction_count: row.transaction_count,
      // Only filled when the previous month has data to compare with
      previous_month_total: hasPreviousMonth ? round(row.previous_total) : null,
      ...(hasPreviousMonth ? change(row.total, row.previous_total) : { change_amount: null, change_percent: null }),
    }))
    .sort((a, b) => b.total - a.total);

  const budgetStats = budgets.rows.map((row) => {
    const used = Math.round((row.spent / row.amount_limit) * 1000) / 10;
    return {
      category: row.category ?? "Overall",
      is_overall: row.category_id === null,
      limit: row.amount_limit,
      spent: round(row.spent),
      remaining: round(row.amount_limit - row.spent),
      percent_used: used,
      status: budgetStatus(used),
    };
  });

  const pastMonths = history.rows.filter((row) => row.expenses > 0 || row.income > 0);
  const average = pastMonths.length > 0 ? round(pastMonths.reduce((sum, row) => sum + row.expenses, 0) / pastMonths.length) : null;
  const savedThisMonth = round(goals.rows.reduce((sum, goal) => sum + goal.contributed_this_month, 0));

  const notes: string[] = [];
  if (t.income === 0) notes.push("No income was recorded this month.");
  if (!hasPreviousMonth) notes.push("There is no data for the previous month, so month-to-month changes cannot be compared.");
  if (pastMonths.length < HISTORY_MONTHS) {
    notes.push(`Only ${pastMonths.length} of the previous ${HISTORY_MONTHS} months have recorded data.`);
  }
  if (budgetStats.length === 0) notes.push("No budget was set for this month.");

  return {
    month,
    currency: user.rows[0]?.currency ?? "MAD",
    totals: {
      income: round(t.income),
      expenses: round(expenses),
      net: round(t.income - expenses),
      // Share of income not spent. This is NOT savings: only saved_to_goals is money put aside
      unspent_income_percent: percent(t.income - expenses, t.income),
      transaction_count: t.transaction_count,
      expense_count: t.expense_count,
      // Savings contributions are tracked separately and are not part of expenses
      saved_to_goals: savedThisMonth,
    },
    categories: categoryStats,
    top_categories: categoryStats.filter((c) => c.total > 0).slice(0, 3).map((c) => c.category),
    budgets: {
      overall: budgetStats.find((b) => b.is_overall) ?? null,
      categories: budgetStats.filter((b) => !b.is_overall),
    },
    history: {
      has_previous_month: hasPreviousMonth,
      months_with_data: pastMonths.length,
      previous_month: hasPreviousMonth
        ? { month: previous.month, income: round(previous.income), expenses: round(previous.expenses), ...change(expenses, previous.expenses) }
        : null,
      average_expenses_previous_months: average,
    },
    savings_goals: goals.rows.map((goal) => ({
      name: goal.name,
      target: goal.target_amount,
      saved: round(goal.saved),
      progress_percent: percent(Math.min(goal.saved, goal.target_amount), goal.target_amount) ?? 0,
      contributed_this_month: round(goal.contributed_this_month),
      is_completed: goal.is_completed,
    })),
    data_notes: notes,
  };
}

export function previousMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
