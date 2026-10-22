import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db";
import savingsGoalsRouter from "./routes/savingsGoals";
import dashboardRouter from "./routes/dashboard";
import categoriesRouter from "./routes/categories";
import receiptsRouter from "./routes/receipts";
import reportsRouter from "./routes/reports";
import { currencyRouter, usersRouter } from "./routes/users";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// FRONTEND_URL can hold several URLs separated by commas.
// Outside production, any localhost port is allowed (Next.js may use 3001, 3002...).
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map((url) => url.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalhost = !!origin && /^http:\/\/localhost:\d+$/.test(origin);
      const allowed =
        !origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== "production" && isLocalhost);
      callback(null, allowed);
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", database: "connected", time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: "error", database: "not connected" });
  }
});

app.use("/api/savings-goals", savingsGoalsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/receipts", receiptsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/users", usersRouter);
app.use("/api/currency", currencyRouter);

// Catches errors thrown in any route
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
