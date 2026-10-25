import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Request, Response } from "express";
import { pool } from "../db";
import { AiServiceError, callAiService } from "../services/aiService";
import { parseAmount, parseDate, parseId, parseText, today } from "../utils/validation";

// Receipts are stored outside any public folder; only the owner can read them through the API
export const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "receipts");

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type Extraction = {
  is_receipt: boolean;
  raw_text: string;
  merchant: string | null;
  date: string | null;
  total_amount: number | null;
  currency: string | null;
  suggested_category: string | null;
  category_reason: string | null;
  items: { name: string; price: number | null }[];
  notes: string | null;
  confidence: Record<string, "high" | "medium" | "low">;
  missing_fields: string[];
};

async function findReceipt(userId: number, receiptId: number) {
  const result = await pool.query(
    `SELECT r.*, t.id AS transaction_id FROM receipts r
     LEFT JOIN transactions t ON t.receipt_id = r.id
     WHERE r.id = $1 AND r.user_id = $2`,
    [receiptId, userId]
  );
  return result.rows[0] ?? null;
}

// POST /api/receipts/scan (multipart, field "file")
// Saves the image, asks the AI service to read it, and returns the extracted data for review.
// Nothing is saved as a transaction here.
export async function scanReceipt(req: Request, res: Response) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Please choose a receipt image" });

  const userId = req.userId!;
  const fileName = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`;
  const relativePath = path.join(String(userId), fileName);
  await fs.mkdir(path.join(UPLOAD_DIR, String(userId)), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, relativePath), file.buffer);

  const receipt = await pool.query("INSERT INTO receipts (user_id, file_path) VALUES ($1, $2) RETURNING id", [
    userId,
    relativePath,
  ]);
  const receiptId = receipt.rows[0].id;

  const categories = await pool.query(
    "SELECT id, name FROM categories WHERE (user_id IS NULL OR user_id = $1) AND type = 'expense'",
    [userId]
  );

  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    form.append("categories", JSON.stringify(categories.rows.map((c) => c.name)));

    const extraction = await callAiService<Extraction>("/receipts/analyze", { method: "POST", body: form });

    await pool.query("UPDATE receipts SET ocr_text = $1, extracted_data = $2 WHERE id = $3", [
      extraction.raw_text,
      JSON.stringify(extraction),
      receiptId,
    ]);

    const category = categories.rows.find((c) => c.name === extraction.suggested_category);
    res.json({
      receipt_id: receiptId,
      status: extraction.is_receipt ? "extracted" : "not_a_receipt",
      extraction: { ...extraction, suggested_category_id: category?.id ?? null },
    });
  } catch (error) {
    // OCR failed: the receipt is kept so the user can still enter the expense by hand
    if (!(error instanceof AiServiceError)) throw error;
    res.json({ receipt_id: receiptId, status: "failed", error: error.message, extraction: null });
  }
}

// GET /api/receipts/:id/image
export async function getReceiptImage(req: Request, res: Response) {
  const receiptId = parseId(req.params.id);
  const receipt = receiptId && (await findReceipt(req.userId!, receiptId));
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });

  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(path.join(UPLOAD_DIR, receipt.file_path));
}

// POST /api/receipts/:id/confirm
// Saves the reviewed (and possibly corrected) information as an expense transaction.
export async function confirmReceipt(req: Request, res: Response) {
  const userId = req.userId!;
  const receiptId = parseId(req.params.id);
  const receipt = receiptId && (await findReceipt(userId, receiptId));
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });
  if (receipt.transaction_id) {
    return res.status(409).json({ error: "This receipt was already saved as an expense" });
  }

  const body = req.body ?? {};
  const amount = parseAmount(body.amount);
  const date = parseDate(body.date);
  const categoryId = parseId(body.category_id);
  const merchant = body.merchant ? parseText(body.merchant, 150) : null;
  const description = body.description ? parseText(body.description, 255) : null;

  if (!amount) return res.status(400).json({ error: "Enter the total amount paid" });
  if (!date) return res.status(400).json({ error: "Enter a valid purchase date" });
  if (date > today()) return res.status(400).json({ error: "The purchase date can't be in the future" });
  if (!categoryId) return res.status(400).json({ error: "Choose a category" });
  if (body.merchant && !merchant) return res.status(400).json({ error: "Merchant name is too long" });
  if (body.description && !description) return res.status(400).json({ error: "Description is too long" });

  const category = await pool.query(
    "SELECT id FROM categories WHERE id = $1 AND type = 'expense' AND (user_id IS NULL OR user_id = $2)",
    [categoryId, userId]
  );
  if (category.rowCount === 0) return res.status(400).json({ error: "Choose one of your expense categories" });

  const result = await pool.query(
    `INSERT INTO transactions (user_id, category_id, receipt_id, type, amount, date, description, merchant)
     VALUES ($1, $2, $3, 'expense', $4, $5, $6, $7)
     RETURNING id, amount::float AS amount, to_char(date, 'YYYY-MM-DD') AS date, merchant, description`,
    [userId, categoryId, receiptId, amount, date, description, merchant]
  );

  res.status(201).json(result.rows[0]);
}

// GET /api/receipts - scan history, newest first
// For saved receipts the amount comes from the expense (what the user confirmed),
// otherwise from what the AI read.
export async function listReceipts(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT r.id, r.created_at,
       t.id AS transaction_id,
       t.amount::float AS saved_amount,
       to_char(t.date, 'YYYY-MM-DD') AS saved_date,
       c.name AS category,
       COALESCE(t.merchant, r.extracted_data->>'merchant') AS merchant,
       (r.extracted_data->>'total_amount')::float AS read_amount,
       r.extracted_data->>'currency' AS read_currency,
       r.extracted_data IS NOT NULL AS was_read
     FROM receipts r
     LEFT JOIN transactions t ON t.receipt_id = r.id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [req.userId]
  );
  res.json(result.rows);
}

// GET /api/receipts/:id - reopen a receipt that was scanned but not saved yet
export async function getReceipt(req: Request, res: Response) {
  const userId = req.userId!;
  const receiptId = parseId(req.params.id);
  const receipt = receiptId && (await findReceipt(userId, receiptId));
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });

  const extraction = receipt.extracted_data as Extraction | null;
  let suggestedCategoryId: number | null = null;
  if (extraction?.suggested_category) {
    const category = await pool.query(
      "SELECT id FROM categories WHERE name = $1 AND type = 'expense' AND (user_id IS NULL OR user_id = $2) LIMIT 1",
      [extraction.suggested_category, userId]
    );
    suggestedCategoryId = category.rows[0]?.id ?? null;
  }

  res.json({
    receipt_id: receipt.id,
    transaction_id: receipt.transaction_id,
    status: !extraction ? "failed" : extraction.is_receipt ? "extracted" : "not_a_receipt",
    extraction: extraction ? { ...extraction, suggested_category_id: suggestedCategoryId } : null,
  });
}

// DELETE /api/receipts/:id - removes the photo; a saved expense stays (it just loses its receipt link)
export async function deleteReceipt(req: Request, res: Response) {
  const receiptId = parseId(req.params.id);
  const receipt = receiptId && (await findReceipt(req.userId!, receiptId));
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });

  await pool.query("DELETE FROM receipts WHERE id = $1 AND user_id = $2", [receipt.id, req.userId]);
  await fs.rm(path.join(UPLOAD_DIR, receipt.file_path), { force: true });
  res.status(204).send();
}
