import path from "path";
import type { NextConfig } from "next";

// Production (Vercel): the browser calls /api/... on the frontend's own domain and Vercel forwards it
// to the backend on Render. The login cookie then stays first-party (no cross-site cookie problems).
const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Hide the Next.js dev badge: it covers the phone tab bar
  devIndicators: false,
  // This folder is the project root (a stray package-lock.json higher up confuses Next.js)
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return BACKEND_URL ? [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }] : [];
  },
};

export default nextConfig;
