
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { pool } from "../db";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

const ACCESS_MAX_AGE = 30 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const
};

function generateAccessToken(userId: number) {
  return jwt.sign(
    { userId },
    JWT_SECRET!,
    { expiresIn: "30s", algorithm: "HS256" }
  );
}

function generateRefreshToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setAccessCookie(res: Response, userId: number) {
  res.cookie("access_token", generateAccessToken(userId), {
    ...cookieOptions,
    path: "/",
    maxAge: ACCESS_MAX_AGE
  });
}

function setRefreshCookie(
  res: Response,
  token: string,
  remainingMs: number
) {
  res.cookie("refresh_token", token, {
    ...cookieOptions,
    path: "/api/auth",
    maxAge: remainingMs
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", {
    ...cookieOptions,
    path: "/"
  });

  res.clearCookie("refresh_token", {
    ...cookieOptions,
    path: "/api/auth"
  });
}

async function createSession(userId: number, res: Response) {
  const refreshToken = generateRefreshToken();
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE);

  await pool.query(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [
      userId,
      hashToken(refreshToken),
      familyId,
      expiresAt
    ]
  );

  setAccessCookie(res, userId);
  setRefreshCookie(res, refreshToken, REFRESH_MAX_AGE);
}

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.trim().length > 255 ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        error: "Invalid name, email or password"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, currency`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];

    await createSession(user.id, res);

    return res.status(201).json({
      message: "User registered successfully",
      user
    });

  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, currency, password_hash
       FROM users
       WHERE LOWER(email) = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    await createSession(user.id, res);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;

  if (typeof token !== "string" || !token) {
    return res.status(401).json({
      error: "Refresh token required"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the token record to prevent concurrent rotation.
    const result = await client.query(
      `SELECT id, user_id, family_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1
       FOR UPDATE`,
      [hashToken(token)]
    );

    const session = result.rows[0];

    if (!session) {
      await client.query("ROLLBACK");
      clearAuthCookies(res);
      return res.status(401).json({
        error: "Invalid refresh token"
      });
    }

    // A previously rotated token was presented again.
    // Revoke the entire login session.
    if (session.revoked_at !== null) {
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE family_id = $1`,
        [session.family_id]
      );

      await client.query("COMMIT");
      clearAuthCookies(res);

      return res.status(401).json({
        error: "Refresh session revoked"
      });
    }

    const remainingMs =
      new Date(session.expires_at).getTime() - Date.now();

    if (remainingMs <= 0) {
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE id = $1`,
        [session.id]
      );

      await client.query("COMMIT");
      clearAuthCookies(res);

      return res.status(401).json({
        error: "Refresh session expired"
      });
    }

    // Revoke the old refresh token.
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1`,
      [session.id]
    );

    const newRefreshToken = generateRefreshToken();

    // The replacement keeps the original session expiry.
    await client.query(
      `INSERT INTO refresh_tokens
         (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        session.user_id,
        hashToken(newRefreshToken),
        session.family_id,
        session.expires_at
      ]
    );

    await client.query("COMMIT");

    setAccessCookie(res, session.user_id);
    setRefreshCookie(res, newRefreshToken, remainingMs);

    return res.status(200).json({
      message: "Session refreshed"
    });

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Refresh error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    client.release();
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies?.refresh_token;

    if (typeof token === "string" && token) {
      await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE family_id = (
           SELECT family_id
           FROM refresh_tokens
           WHERE token_hash = $1
         )`,
        [hashToken(token)]
      );
    }

    clearAuthCookies(res);

    return res.status(200).json({
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
