
import { Request, Response } from "express";
import { pool } from "../db";

const BUDGET_SELECT = `
  SELECT
    b.id,
    b.user_id,
    b.category_id,
    c.name AS category_name,
    TO_CHAR(b.month, 'YYYY-MM') AS month,
    b.amount_limit::text AS amount_limit,
    COALESCE(s.spent, 0)::text AS spent,
    (b.amount_limit - COALESCE(s.spent, 0))::text AS remaining,
    ROUND(
      COALESCE(s.spent, 0) * 100 / b.amount_limit, 2
    )::text AS percentage_used,
    (COALESCE(s.spent, 0) >= b.amount_limit) AS is_exceeded,
    b.created_at,
    b.updated_at
  FROM budgets b
  LEFT JOIN categories c ON c.id = b.category_id
  LEFT JOIN LATERAL (
    SELECT SUM(t.amount) AS spent
    FROM transactions t
    WHERE t.user_id = b.user_id
      AND t.type = 'expense'
      AND t.date >= b.month
      AND t.date < (b.month + INTERVAL '1 month')
      AND (
        b.category_id IS NULL
        OR t.category_id = b.category_id
      )
  ) s ON TRUE
`;

function parseId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validMonth(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  return year >= 1;
}

function validAmount(value: unknown): boolean {
  if (typeof value !== "number" && typeof value !== "string") {
    return false;
  }

  const text = String(value);

  return (
    /^\d+(\.\d{1,2})?$/.test(text) &&
    Number(text) > 0 &&
    Number(text) <= 9999999999.99
  );
}

function parseCategoryId(value: unknown): number | null {
  if (value === null) return null;
  return parseId(String(value));
}

async function categoryIsAccessible(
  categoryId: number | null,
  userId: number
): Promise<boolean> {
  if (categoryId === null) return true;

  const result = await pool.query(
    `SELECT id
     FROM categories
     WHERE id = $1
       AND type = 'expense'
       AND (user_id IS NULL OR user_id = $2)`,
    [categoryId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

function budgetError(res: Response, error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "A budget already exists for this month and category"
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error: "Invalid category reference"
      });
    }
  }

  console.error("Budget error:", error);

  return res.status(500).json({
    error: "Internal server error"
  });
}

// POST /api/budgets
export async function createBudget(req: Request, res: Response) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { month, amount_limit, category_id = null } = body;

    if (!validMonth(month)) {
      return res.status(400).json({ error: "Month must be YYYY-MM" });
    }

    if (!validAmount(amount_limit)) {
      return res.status(400).json({
        error: "Invalid budget amount"
      });
    }

    const categoryId = parseCategoryId(category_id);

    if (category_id !== null && categoryId === null) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    if (!(await categoryIsAccessible(categoryId, req.userId!))) {
      return res.status(400).json({
        error: "Category must be an accessible expense category"
      });
    }

    const inserted = await pool.query(
      `INSERT INTO budgets (user_id, category_id, month, amount_limit)
       VALUES ($1, $2, $3::date, $4::numeric)
       RETURNING id`,
      [req.userId, categoryId, `${month}-01`, String(amount_limit)]
    );

    const result = await pool.query(
      `${BUDGET_SELECT}
       WHERE b.id = $1 AND b.user_id = $2`,
      [inserted.rows[0].id, req.userId]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return budgetError(res, error);
  }
}

// GET /api/budgets
export async function getBudgets(req: Request, res: Response) {
  try {
    const { month } = req.query;

    if (month !== undefined && !validMonth(month)) {
      return res.status(400).json({ error: "Month must be YYYY-MM" });
    }

    const result = await pool.query(
      `${BUDGET_SELECT}
       WHERE b.user_id = $1
         AND ($2::date IS NULL OR b.month = $2::date)
       ORDER BY b.month DESC, b.category_id NULLS FIRST, b.id`,
      [req.userId, month ? `${month}-01` : null]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return budgetError(res, error);
  }
}

// GET /api/budgets/:id
export async function getBudgetById(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (id === null) {
      return res.status(400).json({ error: "Invalid budget ID" });
    }

    const result = await pool.query(
      `${BUDGET_SELECT}
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return budgetError(res, error);
  }
}

// PATCH /api/budgets/:id
export async function updateBudget(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (id === null) {
      return res.status(400).json({ error: "Invalid budget ID" });
    }

    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const allowed = ["month", "amount_limit", "category_id"];

    if (
      Object.keys(body).length === 0 ||
      Object.keys(body).some(key => !allowed.includes(key))
    ) {
      return res.status(400).json({
        error: "Provide a valid budget field to update"
      });
    }

    if (body.month !== undefined && !validMonth(body.month)) {
      return res.status(400).json({ error: "Month must be YYYY-MM" });
    }

    if (
      body.amount_limit !== undefined &&
      !validAmount(body.amount_limit)
    ) {
      return res.status(400).json({ error: "Invalid budget amount" });
    }

    const categoryProvided =
      Object.prototype.hasOwnProperty.call(body, "category_id");

    const categoryId = categoryProvided
      ? parseCategoryId(body.category_id)
      : null;

    if (categoryProvided &&
        body.category_id !== null &&
        categoryId === null) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    if (
      categoryProvided &&
      !(await categoryIsAccessible(categoryId, req.userId!))
    ) {
      return res.status(400).json({
        error: "Category must be an accessible expense category"
      });
    }

    const updated = await pool.query(
      `UPDATE budgets
       SET
         month = COALESCE($1::date, month),
         amount_limit = COALESCE($2::numeric, amount_limit),
         category_id = CASE
           WHEN $3::boolean THEN $4::integer
           ELSE category_id
         END,
         updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id`,
      [
        body.month !== undefined ? `${body.month}-01` : null,
        body.amount_limit !== undefined ? String(body.amount_limit) : null,
        categoryProvided,
        categoryId,
        id,
        req.userId
      ]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const result = await pool.query(
      `${BUDGET_SELECT}
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, req.userId]
    );

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return budgetError(res, error);
  }
}

// DELETE /api/budgets/:id
export async function deleteBudget(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (id === null) {
      return res.status(400).json({ error: "Invalid budget ID" });
    }

    const result = await pool.query(
      `DELETE FROM budgets
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    return res.status(200).json({
      message: "Budget deleted successfully"
    });
  } catch (error) {
    return budgetError(res, error);
  }
}
