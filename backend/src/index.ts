import "dotenv/config";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { pool } from "./db";

import savingsGoalsRouter from "./routes/savingsGoals";
import dashboardRouter from "./routes/dashboard";
import categoriesRouter from "./routes/categories";
import receiptsRouter from "./routes/receipts";
import reportsRouter from "./routes/reports";

import { requireTrustedOrigin } from "./middleware/csrf";
import { currencyRouter, usersRouter } from "./routes/users";
import authRouter from "./routes/auth";

const app = express();
const PORT = process.env.PORT || 4000;

// Allowed frontend origins
const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:3000"
)
  .split(",")
  .map((url) => url.trim());

// 1. Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalhost =
        !!origin && /^http:\/\/localhost:\d+$/.test(origin);

      const allowed =
        !origin ||
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== "production" && isLocalhost);

      callback(null, allowed);
    },
    credentials: true,
  })
);

// 2. Parse JSON request bodies
app.use(express.json());

// 3. Parse incoming cookies
app.use(cookieParser());

// 4. Validate request origins BEFORE API routes
app.use(requireTrustedOrigin);

// 5. Health checks
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "backend",
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "not connected",
    });
  }
});

// 6. Authentication routes
app.use("/api/auth", authRouter);

// 7. Existing application routes
app.use("/api/savings-goals", savingsGoalsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/receipts", receiptsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/users", usersRouter);
app.use("/api/currency", currencyRouter);

// 8. Global error handler
app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(error);

    res.status(500).json({
      error: "Something went wrong",
    });
  }
);

// 9. Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});