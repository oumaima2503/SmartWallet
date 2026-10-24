import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/"
};

function generateToken(userId: number) {
  return jwt.sign(
    { userId },
    JWT_SECRET!,
    { expiresIn: "1h", algorithm: "HS256" }
  );
}

// REGISTER
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

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, currency`,
      [name.trim(), normalizedEmail, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.cookie("access_token", token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000
    });

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

    console.error(error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

// LOGIN
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

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const token = generateToken(user.id);

    res.cookie("access_token", token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000
    });

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
    console.error(error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

// LOGOUT
export function logout(_req: Request, res: Response) {
  res.clearCookie("access_token", cookieOptions);

  return res.status(200).json({
    message: "Logout successful"
  });
}