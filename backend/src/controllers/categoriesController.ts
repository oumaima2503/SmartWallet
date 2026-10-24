import { Request, Response } from "express";
import { pool } from "../db";

// GET /api/categories
// Retrieve default categories + user's own categories
export async function listCategories(req: Request, res: Response) {
  try {
    const type = req.query.type;

    if (
      type !== undefined &&
      type !== "income" &&
      type !== "expense"
    ) {
      return res.status(400).json({
        error: "type must be income or expense"
      });
    }

    const result = await pool.query(
      `SELECT id, name, type,
              user_id IS NOT NULL AS is_custom
       FROM categories
       WHERE (user_id IS NULL OR user_id = $1)
         AND ($2::text IS NULL OR type = $2)
       ORDER BY type, is_custom, name`,
      [req.userId, type ?? null]
    );

    return res.json(result.rows);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
// POST /api/categories
export async function createCategory(req: Request, res: Response) {
  try {
    const { name, type } = req.body ?? {};

    // Validate category name
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        error: "Name must contain 1 to 100 characters"
      });
    }

    // Validate category type
    if (type !== "income" && type !== "expense") {
      return res.status(400).json({
        error: "Type must be income or expense"
      });
    }

    // Associate category with authenticated user
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, type)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, user_id IS NOT NULL AS is_custom`,
      [req.userId, name.trim(), type]
    );

    return res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("Create category error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
// PATCH /api/categories/:id
export async function updateCategory(req: Request, res: Response) {
  try {
    const categoryId = Number(req.params.id);
    const { name } = req.body ?? {};

    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        error: "Invalid category ID"
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        error: "Name must contain 1 to 100 characters"
      });
    }

    const result = await pool.query(
      `UPDATE categories
       SET name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, type, user_id IS NOT NULL AS is_custom`,
      [name.trim(), categoryId, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Category not found or not owned by user"
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
// DELETE /api/categories/:id
export async function deleteCategory(req: Request, res: Response) {
  try {
    const categoryId = Number(req.params.id);

    // 1. Validate category ID
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        error: "Invalid category ID"
      });
    }

    // 2. Delete only the authenticated user's category
    const result = await pool.query(
      `DELETE FROM categories
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [categoryId, req.userId]
    );

    // 3. Category doesn't exist or belongs to another user
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Category not found"
      });
    }

    // 4. Successful deletion
    return res.status(200).json({
      message: "Category deleted successfully"
    });

  } catch (error: unknown) {
    // Category referenced by another database record
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return res.status(409).json({
        error: "Category is used by existing records"
      });
    }

    console.error("Delete category error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}