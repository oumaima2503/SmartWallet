import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. The session (loaded from PostgreSQL by express-session) says who is logged in
  const userId = req.session.userId;

  if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) {
    res.status(401).json({
      error: "Authentication required"
    });
    return;
  }

  // 2. Attach authenticated user ID to request
  req.userId = userId;

  // 3. Continue to protected route
  next();
}
