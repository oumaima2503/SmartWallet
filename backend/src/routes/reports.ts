import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateReport, getReport, listReports } from "../controllers/reportsController";

const router = Router();

router.use(requireAuth);

router.get("/", listReports);
router.post("/", generateReport);
router.get("/:month", getReport);

export default router;
