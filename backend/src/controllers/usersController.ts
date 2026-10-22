import { Request, Response } from "express";
import { pool } from "../db";
import { getRates, isSupportedCurrency, SUPPORTED_CURRENCIES } from "../services/exchangeRates";

// GET /api/users/me
export async function getMe(req: Request, res: Response) {
  const result = await pool.query("SELECT id, name, email, currency FROM users WHERE id = $1", [req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
  res.json(result.rows[0]);
}

// PATCH /api/users/me { currency } - display currency. Amounts stay stored in MAD.
export async function updateMe(req: Request, res: Response) {
  const currency = req.body?.currency;
  if (!isSupportedCurrency(currency)) {
    return res.status(400).json({ error: `Currency must be one of ${SUPPORTED_CURRENCIES.join(", ")}` });
  }

  const result = await pool.query(
    "UPDATE users SET currency = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, currency",
    [currency, req.userId]
  );
  res.json(result.rows[0]);
}

// GET /api/currency/rates
export async function getCurrencyRates(_req: Request, res: Response) {
  res.json(await getRates());
}
