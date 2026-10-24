import { Request, Response, NextFunction } from "express";

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("Origin");

  const allowedOrigins = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  )
    .split(",")
    .map((url) => url.trim());

  // Temporary debugging
  console.log("Request method:", req.method);
  console.log("Request origin:", JSON.stringify(origin));
  console.log("Allowed origins:", allowedOrigins);
  console.log(
    "Is allowed:",
    !!origin && allowedOrigins.includes(origin)
  );

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: "Untrusted request origin"
    });
  }

  next();
}