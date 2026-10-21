import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// TEMPORARY: until login is built, every request acts as the seeded demo user.
// Replace this with the real JWT check; routes only rely on req.userId.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.userId = Number(process.env.DEMO_USER_ID || 1);
  next();
}
