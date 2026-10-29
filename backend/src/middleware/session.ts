import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// JWT_SECRET: the name used before sessions, so an existing deployment keeps working
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters");
}

export const SESSION_COOKIE = "sid";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

const PgStore = connectPgSimple(session);

// The session lives in PostgreSQL (table user_sessions), the browser only gets a random id.
// All the tabs of a browser share the same cookie, so they share the same session.
export const sessionMiddleware = session({
  name: SESSION_COOKIE,
  secret: SESSION_SECRET,
  store: new PgStore({ pool, tableName: "user_sessions", pruneSessionInterval: 60 * 60 }),
  // No session row for visitors who are not logged in
  saveUninitialized: false,
  resave: false,
  // Every request pushes the expiry 7 days further: logged out after 7 days without using the app
  rolling: true,
  // Production: the HTTPS is handled by Render's proxy, so the secure cookie must trust X-Forwarded-Proto
  proxy: isProduction,
  cookie: { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE },
});
