import { Request, Response } from "express";
import { pool } from "../db";
import { getRates, isSupportedCurrency, SUPPORTED_CURRENCIES } from "../services/exchangeRates";

// GET /api/users/me
export async function getMe(req: Request, res: Response) {
  const result = await pool.query("SELECT id, name, email, currency, avatar FROM users WHERE id = $1", [req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
  res.json(result.rows[0]);
}

// Profile photo: a small image sent as a data URL (resized in the browser), or null to remove it
const AVATAR_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX_LENGTH = 150_000;

// PATCH /api/users/me { name?, email?, currency?, avatar? }
// currency is the display currency: amounts stay stored in MAD
export async function updateMe(req: Request, res: Response) {
  try {
    const body = req.body ?? {};
    const { name, email, currency, avatar } = body;
    const avatarProvided = Object.prototype.hasOwnProperty.call(body, "avatar");

    // At least one field must be provided
    if (
      name === undefined &&
      email === undefined &&
      currency === undefined &&
      !avatarProvided
    ) {
      return res.status(400).json({
        error: "Provide at least one field: name, email, currency or avatar"
      });
    }

    // Validate avatar
    if (
      avatarProvided &&
      avatar !== null &&
      (typeof avatar !== "string" || avatar.length > AVATAR_MAX_LENGTH || !AVATAR_PATTERN.test(avatar))
    ) {
      return res.status(400).json({
        error: "The photo must be a JPEG, PNG or WEBP image under 100 KB"
      });
    }

    // Validate name
    if (
      name !== undefined &&
      (typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100)
    ) {
      return res.status(400).json({
        error: "Name must contain 1 to 100 characters"
      });
    }

    // Validate email
    if (
      email !== undefined &&
      (typeof email !== "string" ||
        email.trim().length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      return res.status(400).json({
        error: "Invalid email address"
      });
    }

    // Validate currency
    if (
      currency !== undefined &&
      !isSupportedCurrency(currency)
    ) {
      return res.status(400).json({
        error: `Currency must be one of ${SUPPORTED_CURRENCIES.join(", ")}`
      });
    }

    const normalizedName =
      name !== undefined ? name.trim() : null;

    const normalizedEmail =
      email !== undefined ? email.trim().toLowerCase() : null;

    const result = await pool.query(
      `UPDATE users
       SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         currency = COALESCE($3, currency),
         avatar = CASE WHEN $5::boolean THEN $6::text ELSE avatar END,
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, currency, avatar`,
      [
        normalizedName,
        normalizedEmail,
        currency ?? null,
        req.userId,
        avatarProvided,
        avatarProvided ? avatar : null
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    return res.json({
      message: "Profile updated successfully",
      user: result.rows[0]
    });

  } catch (error: any) {
    // PostgreSQL unique constraint violation
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Email already in use"
      });
    }

    console.error("Update profile error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

// GET /api/currency/rates
export async function getCurrencyRates(_req: Request, res: Response) {
  res.json(await getRates());
}
