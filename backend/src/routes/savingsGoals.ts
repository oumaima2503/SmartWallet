import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
} from "../controllers/savingsGoalsController";

const router = Router();

router.use(requireAuth);

router.get("/", listGoals);
router.post("/", createGoal);
router.get("/:id", getGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);
router.post("/:id/contributions", addContribution);
router.delete("/:id/contributions/:contributionId", deleteContribution);

export default router;
