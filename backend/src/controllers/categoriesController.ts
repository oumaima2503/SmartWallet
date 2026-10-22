import { Request, Response } from "express";
import { pool } from "../db";

// Default categories + the user's own categories. Optional ?type=income|expense
export async function listCategories(req: Request, res: Response) {
  const type = req.query.type;
  if (type !== undefined && type !== "income" && type !== "expense") {
    return res.status(400).json({ error: "type must be income or expense" });
  }

  const result = await pool.query(
    `SELECT id, name, type, user_id IS NOT NULL AS is_custom
     FROM categories
     WHERE (user_id IS NULL OR user_id = $1) AND ($2::text IS NULL OR type = $2)
     ORDER BY type, is_custom, name`,
    [req.userId, type ?? null]
  );
  res.json(result.rows);
}
