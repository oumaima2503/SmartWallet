import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev badge: it covers the phone tab bar
  devIndicators: false,
  // This folder is the project root (a stray package-lock.json higher up confuses Next.js)
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
