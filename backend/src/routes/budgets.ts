
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

import {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget
} from "../controllers/budgetsController";

const router = Router();

router.use(requireAuth);

router.post("/", createBudget);
router.get("/", getBudgets);
router.get("/:id", getBudgetById);
router.patch("/:id", updateBudget);
router.delete("/:id", deleteBudget);

export default router;
