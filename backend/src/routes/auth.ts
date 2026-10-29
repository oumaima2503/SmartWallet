import { Router } from "express";
import {
  register,
  login,
  logout
} from "../controllers/authController";

import { authLimiter } from "../middleware/ratelimiter";

const router = Router();

// Create an account
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

export default router;
