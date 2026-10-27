import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboard, getTrend } from "../controllers/dashboardController";

const router = Router();

router.use(requireAuth);

router.get("/", getDashboard);
router.get("/trend", getTrend);

export default router;
