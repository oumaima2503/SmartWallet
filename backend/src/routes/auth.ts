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

// Login with email and password
router.post("/login", authLimiter, login);

// Logout
router.post("/logout", authLimiter, logout);

export default router;