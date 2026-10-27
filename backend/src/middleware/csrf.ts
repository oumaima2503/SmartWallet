import { Request, Response, NextFunction } from "express";

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Allow safe HTTP methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // 2. Get the origin of the incoming request
  const origin = req.get("Origin");

  // 3. Retrieve trusted frontend origins
  const allowedOrigins = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  )
    .split(",")
    .map((url) => url.trim());

  // 4. Reject requests from untrusted origins
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: "Untrusted request origin"
    });
  }

  // 5. Allow the request to continue
  next();
}