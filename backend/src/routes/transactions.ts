import { Router } from "express";
import { requireAuth } from "../middleware/auth";

import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary
} from "../controllers/transactionsController";

const router = Router();

router.use(requireAuth);

router.post("/", createTransaction);
router.get("/", getTransactions);

// IMPORTANT: Declare this BEFORE /:id
router.get("/summary", getTransactionSummary);

router.get("/:id", getTransactionById);
router.patch("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;