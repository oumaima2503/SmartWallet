import { Request, Response } from "express";
import { pool } from "../db";
import { AiServiceError, callAiService } from "../services/aiService";
import { buildMonthlyStatistics, MonthlyStatistics } from "../services/reportStatistics";

type Insight = { title: string; detail: string; evidence: string };
type Concern = { category: string; detail: string; evidence: string };
type Recommendation = { action: string; reason: string; evidence: string };

type Analysis = {
  overview: string;
  spending_patterns: Insight[];
  budget_concerns: Concern[];
  positive_observations: Insight[];
  recommendations: Recommendation[];
  history_note: string | null;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Checks the AI answer before it is saved. Throws if the report is not usable.
function validateAnalysis(raw: unknown, stats: MonthlyStatistics): Analysis {
  if (!raw || typeof raw !== "object") throw new AiServiceError("The AI returned an empty report");
  const data = raw as Record<string, unknown>;
  const list = (value: unknown) => (Array.isArray(value) ? value.slice(0, 6) : []);

  const insights = (value: unknown): Insight[] =>
    list(value)
      .map((item) => ({ title: text(item?.title, 120), detail: text(item?.detail, 600), evidence: text(item?.evidence, 300) }))
      .filter((item) => item.title && item.detail);

  // Only keep concerns about budgets that really are close to or over their limit
  const realConcerns = [stats!.budgets.overall, ...stats!.budgets.categories].filter(
    (budget) => budget && budget.status !== "ok"
  );
  const concernNames = new Set(realConcerns.map((budget) => budget!.category.toLowerCase()));
  const budgetConcerns = list(data.budget_concerns)
    .map((item) => ({ category: text(item?.category, 100), detail: text(item?.detail, 600), evidence: text(item?.evidence, 300) }))
    .filter((item) => item.detail && concernNames.has(item.category.toLowerCase()));

  const recommendations = list(data.recommendations)
    .map((item) => ({ action: text(item?.action, 200), reason: text(item?.reason, 600), evidence: text(item?.evidence, 300) }))
    // A recommendation must point to recorded evidence
    .filter((item) => item.action && item.evidence);

  const analysis: Analysis = {
    overview: text(data.overview, 1200),
    spending_patterns: insights(data.spending_patterns),
    budget_concerns: budgetConcerns,
    positive_observations: insights(data.positive_observations),
    recommendations,
    history_note: text(data.history_note, 400) || null,
  };

  if (!analysis.overview) throw new AiServiceError("The AI report has no overview");
  if (analysis.recommendations.length === 0) throw new AiServiceError("The AI report has no evidence-based recommendations");

  // Never let the report hide that history is missing
  if (!stats!.history.has_previous_month && !analysis.history_note) {
    analysis.history_note = "There is not enough history yet to compare this month with previous months.";
  }
  return analysis;
}

function formatReport(row: { id: number; month: string; statistics: unknown; analysis: unknown; created_at: string }) {
  return { id: row.id, month: row.month, statistics: row.statistics, analysis: row.analysis, created_at: row.created_at };
}

// GET /api/reports - saved reports, newest month first
export async function listReports(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT id, to_char(month, 'YYYY-MM') AS month, created_at,
       (statistics->'totals'->>'expenses')::float AS expenses,
       (statistics->'totals'->>'income')::float AS income
     FROM ai_reports WHERE user_id = $1 ORDER BY month DESC`,
    [req.userId]
  );
  res.json(result.rows);
}

// GET /api/reports/:month - reopen a saved report (no AI call)
// Returns null (not 404) when the month has no report yet: that is a normal state, not an error.
export async function getReport(req: Request, res: Response) {
  const month = String(req.params.month);
  if (!MONTH_PATTERN.test(month)) return res.status(400).json({ error: "Month must use the format YYYY-MM" });

  const result = await pool.query(
    `SELECT id, to_char(month, 'YYYY-MM') AS month, statistics, analysis, created_at
     FROM ai_reports WHERE user_id = $1 AND month = $2::date`,
    [req.userId, `${month}-01`]
  );
  res.json(result.rowCount ? formatReport(result.rows[0]) : null);
}

// POST /api/reports { month, regenerate? }
// Calculates the statistics, asks the AI to interpret them, validates and saves the report.
// If the AI fails, nothing is saved and no other data is touched.
export async function generateReport(req: Request, res: Response) {
  const userId = req.userId!;
  const month = typeof req.body?.month === "string" ? req.body.month : "";
  const regenerate = req.body?.regenerate === true;
  // Language of the AI text (the numbers are the same in every language)
  const language = ["en", "fr", "ar"].includes(req.body?.language) ? req.body.language : "en";

  if (!MONTH_PATTERN.test(month)) return res.status(400).json({ error: "Month must use the format YYYY-MM" });
  if (month > currentMonth()) return res.status(400).json({ error: "You can't analyze a future month" });

  if (!regenerate) {
    const existing = await pool.query(
      `SELECT id, to_char(month, 'YYYY-MM') AS month, statistics, analysis, created_at
       FROM ai_reports WHERE user_id = $1 AND month = $2::date`,
      [userId, `${month}-01`]
    );
    if (existing.rowCount) return res.json(formatReport(existing.rows[0]));
  }

  const statistics = await buildMonthlyStatistics(userId, month);
  if (!statistics) {
    return res.status(400).json({ error: "There are no transactions recorded for this month yet" });
  }

  let analysis: Analysis;
  try {
    const raw = await callAiService<unknown>("/reports/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statistics, language }),
    });
    analysis = validateAnalysis(raw, statistics);
  } catch (error) {
    if (error instanceof AiServiceError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO ai_reports (user_id, month, statistics, analysis) VALUES ($1, $2::date, $3, $4)
     ON CONFLICT (user_id, month) DO UPDATE SET statistics = EXCLUDED.statistics, analysis = EXCLUDED.analysis, created_at = NOW()
     RETURNING id, to_char(month, 'YYYY-MM') AS month, statistics, analysis, created_at`,
    [userId, `${month}-01`, JSON.stringify(statistics), JSON.stringify(analysis)]
  );

  res.status(201).json(formatReport(result.rows[0]));
}
