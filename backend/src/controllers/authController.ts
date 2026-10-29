
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db";
import { SESSION_COOKIE, sessionCookieOptions } from "../middleware/session";

// Log the user in: a NEW session id (an id that existed before login can't be reused), saved in PostgreSQL
function startSession(req: Request, userId: number) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId;
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
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

    await startSession(req, user.id);

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

    await startSession(req, user.id);

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

// POST /api/auth/logout
export async function logout(req: Request, res: Response) {
  // The session row is deleted: the cookie is worthless now, in every tab
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        error: "Internal server error"
      });
    }

    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);

    return res.status(200).json({
      message: "Logout successful"
    });
  });
}
