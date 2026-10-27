import { Router } from "express";
import {
  register,
  login,
  logout,
  refresh
} from "../controllers/authController";

import { authLimiter } from "../middleware/ratelimiter";

const router = Router();

// Create an account
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;