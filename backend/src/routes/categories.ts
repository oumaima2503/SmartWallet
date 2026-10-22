import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listCategories } from "../controllers/categoriesController";

const router = Router();

router.use(requireAuth);

router.get("/", listCategories);

export default router;
