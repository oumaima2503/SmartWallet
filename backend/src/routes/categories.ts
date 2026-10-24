import { Router } from "express";
import { requireAuth } from "../middleware/auth";

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categoriesController";

const router = Router();

router.use(requireAuth);

router.get("/", listCategories);
router.post("/", createCategory);
router.patch("/:id", updateCategory);

// NEW: Delete custom category
router.delete("/:id", deleteCategory);

export default router;