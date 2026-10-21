import { Request, Response } from "express";
import { pool } from "../db";
import { parseAmount, parseDate, parseId, parseText, today } from "../utils/validation";

// Saved amount always comes from recorded contributions (never from unspent income).
// Contributions are not transactions, so they never count as expenses.
const GOAL_SELECT = `
  SELECT g.id, g.name, g.target_amount::float AS target_amount,
         to_char(g.target_date, 'YYYY-MM-DD') AS target_date,
         g.is_completed, g.created_at,
         COALESCE(SUM(c.amount), 0)::float AS saved_amount
  FROM savings_goals g
  LEFT JOIN savings_contributions c ON c.goal_id = g.id
`;

type GoalRow = {
  id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  is_completed: boolean;
  created_at: string;
  saved_amount: number;
};

function formatGoal(goal: GoalRow) {
  const remaining = Math.max(goal.target_amount - goal.saved_amount, 0);
  const progress = Math.min((goal.saved_amount / goal.target_amount) * 100, 100);
  return {
    ...goal,
    remaining_amount: Math.round(remaining * 100) / 100,
    progress_percent: Math.round(progress * 10) / 10,
    target_reached: goal.saved_amount >= goal.target_amount,
  };
}

async function findGoal(userId: number, goalId: number) {
  const result = await pool.query<GoalRow>(
    `${GOAL_SELECT} WHERE g.user_id = $1 AND g.id = $2 GROUP BY g.id`,
    [userId, goalId]
  );
  return result.rows[0] ? formatGoal(result.rows[0]) : null;
}

// If the saved amount drops below the target, the goal can't stay completed.
async function uncompleteIfBelowTarget(goalId: number) {
  await pool.query(
    `UPDATE savings_goals g SET is_completed = FALSE, updated_at = NOW()
     WHERE g.id = $1 AND g.is_completed
       AND g.target_amount > (SELECT COALESCE(SUM(amount), 0) FROM savings_contributions WHERE goal_id = g.id)`,
    [goalId]
  );
}

export async function listGoals(req: Request, res: Response) {
  const result = await pool.query<GoalRow>(
    `${GOAL_SELECT} WHERE g.user_id = $1 GROUP BY g.id ORDER BY g.is_completed, g.created_at DESC`,
    [req.userId]
  );
  const goals = result.rows.map(formatGoal);

  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved_amount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);

  res.json({
    goals,
    summary: {
      total_goals: goals.length,
      completed_goals: goals.filter((goal) => goal.is_completed).length,
      total_saved: Math.round(totalSaved * 100) / 100,
      total_target: Math.round(totalTarget * 100) / 100,
    },
  });
}

export async function getGoal(req: Request, res: Response) {
  const goalId = parseId(req.params.id);
  const goal = goalId && (await findGoal(req.userId!, goalId));
  if (!goal) return res.status(404).json({ error: "Savings goal not found" });

  const contributions = await pool.query(
    `SELECT id, amount::float AS amount, to_char(date, 'YYYY-MM-DD') AS date, note, created_at
     FROM savings_contributions WHERE goal_id = $1 ORDER BY date DESC, id DESC`,
    [goal.id]
  );

  res.json({ ...goal, contributions: contributions.rows });
}

export async function createGoal(req: Request, res: Response) {
  const name = parseText(req.body?.name, 100);
  const targetAmount = parseAmount(req.body?.target_amount);
  const hasDate = req.body?.target_date !== undefined && req.body?.target_date !== null && req.body?.target_date !== "";
  const targetDate = hasDate ? parseDate(req.body.target_date) : null;

  if (!name) return res.status(400).json({ error: "Name is required (max 100 characters)" });
  if (!targetAmount) return res.status(400).json({ error: "Target amount must be a positive number" });
  if (hasDate && !targetDate) return res.status(400).json({ error: "Target date must be a valid date (YYYY-MM-DD)" });

  const result = await pool.query(
    "INSERT INTO savings_goals (user_id, name, target_amount, target_date) VALUES ($1, $2, $3, $4) RETURNING id",
    [req.userId, name, targetAmount, targetDate]
  );

  res.status(201).json(await findGoal(req.userId!, result.rows[0].id));
}

export async function updateGoal(req: Request, res: Response) {
  const goalId = parseId(req.params.id);
  const goal = goalId && (await findGoal(req.userId!, goalId));
  if (!goal) return res.status(404).json({ error: "Savings goal not found" });

  const body = req.body ?? {};
  let name = goal.name;
  let targetAmount = goal.target_amount;
  let targetDate = goal.target_date;
  let isCompleted = goal.is_completed;

  if (body.name !== undefined) {
    const value = parseText(body.name, 100);
    if (!value) return res.status(400).json({ error: "Name is required (max 100 characters)" });
    name = value;
  }
  if (body.target_amount !== undefined) {
    const value = parseAmount(body.target_amount);
    if (!value) return res.status(400).json({ error: "Target amount must be a positive number" });
    targetAmount = value;
  }
  if (body.target_date !== undefined) {
    if (body.target_date === null || body.target_date === "") {
      targetDate = null;
    } else {
      const value = parseDate(body.target_date);
      if (!value) return res.status(400).json({ error: "Target date must be a valid date (YYYY-MM-DD)" });
      targetDate = value;
    }
  }
  if (body.is_completed !== undefined) {
    if (typeof body.is_completed !== "boolean") {
      return res.status(400).json({ error: "is_completed must be true or false" });
    }
    isCompleted = body.is_completed;
  }

  // Raising the target above the saved amount reopens a completed goal
  if (body.is_completed === undefined && goal.saved_amount < targetAmount) {
    isCompleted = false;
  }

  // A goal can only be marked completed when its target is reached
  if (isCompleted && goal.saved_amount < targetAmount) {
    return res.status(400).json({ error: "The goal can only be completed once the target amount is reached" });
  }

  await pool.query(
    `UPDATE savings_goals SET name = $1, target_amount = $2, target_date = $3, is_completed = $4, updated_at = NOW()
     WHERE id = $5 AND user_id = $6`,
    [name, targetAmount, targetDate, isCompleted, goal.id, req.userId]
  );

  res.json(await findGoal(req.userId!, goal.id));
}

export async function deleteGoal(req: Request, res: Response) {
  const goalId = parseId(req.params.id);
  if (!goalId) return res.status(404).json({ error: "Savings goal not found" });

  // Contributions are deleted with the goal (ON DELETE CASCADE)
  const result = await pool.query("DELETE FROM savings_goals WHERE id = $1 AND user_id = $2", [goalId, req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: "Savings goal not found" });

  res.status(204).send();
}

export async function addContribution(req: Request, res: Response) {
  const goalId = parseId(req.params.id);
  const goal = goalId && (await findGoal(req.userId!, goalId));
  if (!goal) return res.status(404).json({ error: "Savings goal not found" });
  if (goal.is_completed) return res.status(400).json({ error: "This goal is already completed" });

  const amount = parseAmount(req.body?.amount);
  const date = req.body?.date ? parseDate(req.body.date) : today();
  const note = req.body?.note ? parseText(req.body.note, 255) : null;

  if (!amount) return res.status(400).json({ error: "Amount must be a positive number" });
  if (!date) return res.status(400).json({ error: "Date must be a valid date (YYYY-MM-DD)" });
  if (date > today()) return res.status(400).json({ error: "Date cannot be in the future" });
  if (req.body?.note && !note) return res.status(400).json({ error: "Note is too long (max 255 characters)" });

  await pool.query("INSERT INTO savings_contributions (goal_id, amount, date, note) VALUES ($1, $2, $3, $4)", [
    goal.id,
    amount,
    date,
    note,
  ]);

  res.status(201).json(await findGoal(req.userId!, goal.id));
}

export async function deleteContribution(req: Request, res: Response) {
  const goalId = parseId(req.params.id);
  const contributionId = parseId(req.params.contributionId);
  if (!goalId || !contributionId) return res.status(404).json({ error: "Contribution not found" });

  const result = await pool.query(
    `DELETE FROM savings_contributions c USING savings_goals g
     WHERE c.id = $1 AND c.goal_id = $2 AND g.id = c.goal_id AND g.user_id = $3`,
    [contributionId, goalId, req.userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Contribution not found" });

  await uncompleteIfBelowTarget(goalId);
  res.json(await findGoal(req.userId!, goalId));
}
