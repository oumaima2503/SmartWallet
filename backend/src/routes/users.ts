import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getCurrencyRates, getMe, updateMe } from "../controllers/usersController";

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get("/me", getMe);
usersRouter.patch("/me", updateMe);

// Public: exchange rates are not personal data
export const currencyRouter = Router();
currencyRouter.get("/rates", getCurrencyRates);
