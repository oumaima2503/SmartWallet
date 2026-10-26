import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { clearConversation, getConversation, sendMessage } from "../controllers/chatController";

const router = Router();

router.use(requireAuth);

// Each question costs an AI call: 30 questions per user every 15 minutes
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `user-${req.userId}`,
  message: { error: "You asked a lot of questions in a short time. Try again in a few minutes." },
});

router.get("/", getConversation);
router.post("/", chatLimiter, sendMessage);
router.delete("/", clearConversation);

export default router;
