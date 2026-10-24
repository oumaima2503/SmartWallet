import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Get JWT from HTTP-only cookie
  const token = req.cookies?.access_token;

  if (!token || typeof token !== "string") {
    res.status(401).json({
      error: "Authentication required"
    });
    return;
  }

  try {
    // 2. Verify the JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET!, {
      algorithms: ["HS256"]
    });

    // 3. Validate userId inside the JWT
    if (
      typeof decoded === "string" ||
      typeof (decoded as JwtPayload).userId !== "number" ||
      !Number.isSafeInteger((decoded as JwtPayload).userId) ||
      (decoded as JwtPayload).userId <= 0
    ) {
      res.status(401).json({
        error: "Invalid token"
      });
      return;
    }

    // 4. Attach authenticated user ID to request
    req.userId = (decoded as JwtPayload).userId;

    // 5. Continue to protected route
    next();

  } catch {
    res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}