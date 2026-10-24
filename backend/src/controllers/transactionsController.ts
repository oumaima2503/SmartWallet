
import { Request, Response } from "express";
import { pool } from "../db";

type TransactionType = "income" | "expense";

const TRANSACTION_SELECT = `
  SELECT
    t.id,
    t.user_id,
    t.category_id,
    c.name AS category_name,
    t.receipt_id,
    t.type,
    t.amount::text AS amount,
    TO_CHAR(t.date, 'YYYY-MM-DD') AS date,
    t.description,
    t.merchant,
    t.created_at,
    t.updated_at
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

function validId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
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

function validOptionalText(value: unknown, maxLength: number): boolean {
  return value === null ||
    (typeof value === "string" && value.length <= maxLength);
}

function parseTransactionFields(
  body: Record<string, unknown>,
  partial = false
): { error?: string } {
  const allowed = new Set([
    "category_id",
    "type",
    "amount",
    "date",
    "description",
    "merchant"
  ]);

  if (Object.keys(body).some(key => !allowed.has(key))) {
    return { error: "Unknown or unsupported transaction field" };
  }

  if (partial && Object.keys(body).length === 0) {
    return { error: "Provide at least one field to update" };
  }

  const required = ["category_id", "type", "amount", "date"];

  if (!partial && required.some(key => body[key] === undefined)) {
    return { error: "category_id, type, amount and date are required" };
  }

  if (body.type !== undefined && !validType(body.type)) {
    return { error: "Type must be income or expense" };
  }

  if (
    body.category_id !== undefined &&
    validId(String(body.category_id)) === null
  ) {
    return { error: "Invalid category ID" };
  }

  if (body.amount !== undefined && !validAmount(body.amount)) {
    return { error: "Amount must be positive with at most 2 decimal places" };
  }

  if (body.date !== undefined && !validDate(body.date)) {
    return { error: "Invalid date (YYYY-MM-DD)" };
  }

  if (
    body.description !== undefined &&
    !validOptionalText(body.description, 255)
  ) {
    return { error: "Description must be text (max 255 characters) or null" };
  }

  if (
    body.merchant !== undefined &&
    !validOptionalText(body.merchant, 150)
  ) {
    return { error: "Merchant must be text (max 150 characters) or null" };
  }

  return {};
}

async function categoryIsAccessible(
  categoryId: number,
  type: TransactionType,
  userId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id
     FROM categories
     WHERE id = $1
       AND type = $2
       AND (user_id IS NULL OR user_id = $3)`,
    [categoryId, type, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

// POST /api/transactions
export async function createTransaction(req: Request, res: Response) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const validation = parseTransactionFields(body);

    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const userId = req.userId!;
    const categoryId = Number(body.category_id);
    const type = body.type as TransactionType;

    if (!(await categoryIsAccessible(categoryId, type, userId))) {
      return res.status(400).json({
        error: "Category is invalid or unavailable to this user"
      });
    }

    const result = await pool.query(
      `INSERT INTO transactions
       (user_id, category_id, type, amount, date, description, merchant)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        categoryId,
        type,
        String(body.amount),
        body.date,
        body.description ?? null,
        body.merchant ?? null
      ]
    );

    const created = await pool.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1 AND t.user_id = $2`,
      [result.rows[0].id, userId]
    );

    return res.status(201).json(created.rows[0]);
  } catch (error) {
    console.error("Create transaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/transactions
// Optional filters: type, category_id, start_date, end_date, search
export async function getTransactions(req: Request, res: Response) {
  try {
    const { type, category_id, start_date, end_date, search } = req.query;

    if (type !== undefined && !validType(type)) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    if (
      category_id !== undefined &&
      validId(category_id) === null
    ) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    if (start_date !== undefined && !validDate(start_date)) {
      return res.status(400).json({ error: "Invalid start_date" });
    }

    if (end_date !== undefined && !validDate(end_date)) {
      return res.status(400).json({ error: "Invalid end_date" });
    }

    if (
      typeof start_date === "string" &&
      typeof end_date === "string" &&
      start_date > end_date
    ) {
      return res.status(400).json({
        error: "start_date cannot be after end_date"
      });
    }

    if (
      search !== undefined &&
      (typeof search !== "string" || search.length > 255)
    ) {
      return res.status(400).json({ error: "Invalid search term" });
    }

    const conditions = ["t.user_id = $1"];
    const params: unknown[] = [req.userId];

    function addCondition(sql: string, value: unknown) {
      params.push(value);
      conditions.push(sql.replace("?", `$${params.length}`));
    }

    if (type !== undefined) {
      addCondition("t.type = ?", type);
    }

    if (category_id !== undefined) {
      addCondition("t.category_id = ?", Number(category_id));
    }

    if (start_date !== undefined) {
      addCondition("t.date >= ?", start_date);
    }

    if (end_date !== undefined) {
      addCondition("t.date <= ?", end_date);
    }

    if (search !== undefined && search.trim() !== "") {
      addCondition(
        "(COALESCE(t.description, '') ILIKE ? OR COALESCE(t.merchant, '') ILIKE ?)",
        null
      );

      // Replace the final condition with two separate parameters.
      conditions.pop();
      params.pop();

      const term = `%${search}%`;
      params.push(term);
      const first = params.length;

      params.push(term);
      const second = params.length;

      conditions.push(
        `(COALESCE(t.description, '') ILIKE $${first}
          OR COALESCE(t.merchant, '') ILIKE $${second})`
      );
    }

    const result = await pool.query(
      `${TRANSACTION_SELECT}
       WHERE ${conditions.join(" AND ")}
       ORDER BY t.date DESC, t.id DESC`,
      params
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get transactions error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/transactions/:id
export async function getTransactionById(req: Request, res: Response) {
  try {
    const id = validId(req.params.id);

    if (id === null) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }

    const result = await pool.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get transaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /api/transactions/:id
export async function updateTransaction(req: Request, res: Response) {
  try {
    const id = validId(req.params.id);

    if (id === null) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }

    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const validation = parseTransactionFields(body, true);

    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const userId = req.userId!;

    // Get the existing transaction and enforce ownership.
    const existing = await pool.query(
      `SELECT id, category_id, type
       FROM transactions
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const nextCategoryId =
      body.category_id !== undefined
        ? Number(body.category_id)
        : existing.rows[0].category_id;

    const nextType: TransactionType =
      body.type !== undefined
        ? body.type as TransactionType
        : existing.rows[0].type;

    if (!(await categoryIsAccessible(nextCategoryId, nextType, userId))) {
      return res.status(400).json({
        error: "Category is invalid or does not match transaction type"
      });
    }

   const result = await pool.query(
  `UPDATE transactions
   SET
     category_id = COALESCE($1::integer, category_id),
     type = COALESCE($2::varchar, type),
     amount = COALESCE($3::numeric, amount),
     date = COALESCE($4::date, date),
     description = CASE
       WHEN $5::boolean THEN $6::varchar
       ELSE description
     END,
     merchant = CASE
       WHEN $7::boolean THEN $8::varchar
       ELSE merchant
     END,
     updated_at = NOW()
   WHERE id = $9 AND user_id = $10
   RETURNING id`,
  [
    body.category_id ?? null,
    body.type ?? null,
    body.amount !== undefined ? String(body.amount) : null,
    body.date ?? null,
    Object.prototype.hasOwnProperty.call(body, "description"),
    body.description ?? null,
    Object.prototype.hasOwnProperty.call(body, "merchant"),
    body.merchant ?? null,
    id,
    userId
  ]
);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const updated = await pool.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );

    return res.status(200).json(updated.rows[0]);
  } catch (error) {
    console.error("Update transaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/transactions/:id
export async function deleteTransaction(req: Request, res: Response) {
  try {
    const id = validId(req.params.id);

    if (id === null) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }

    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    return res.status(200).json({
      message: "Transaction deleted successfully"
    });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTransactionSummary(
  req: Request,
  res: Response
) {
  try {
    const { month } = req.query;

    // Optional month filter: YYYY-MM
    if (
      month !== undefined &&
      (typeof month !== "string" ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    ) {
      return res.status(400).json({
        error: "Month must use YYYY-MM format"
      });
    }

    const startDate =
      typeof month === "string" ? `${month}-01` : null;

    const result = await pool.query(
      `SELECT
         COALESCE(
           SUM(amount) FILTER (WHERE type = 'income'), 0
         )::text AS total_income,

         COALESCE(
           SUM(amount) FILTER (WHERE type = 'expense'), 0
         )::text AS total_expenses,

         COALESCE(
           SUM(
             CASE
               WHEN type = 'income' THEN amount
               ELSE -amount
             END
           ), 0)::text AS balance

       FROM transactions
       WHERE user_id = $1
         AND (
           $2::date IS NULL
           OR (
             date >= $2::date
             AND date < ($2::date + INTERVAL '1 month')
           )
         )`,
      [req.userId, startDate]
    );

    return res.status(200).json({
      month: month ?? null,
      ...result.rows[0]
    });

  } catch (error) {
    console.error("Transaction summary error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

