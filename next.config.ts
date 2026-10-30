import type { NextConfig } from "next";

// cacheComponents is OFF on purpose: almost every Radahn route reads the session, and with
// Cache Components a cookie read outside <Suspense> is a build error. The classic dynamic
// model is lower-risk for a one-day build (CHANGELOG 2026-10-31).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["mongodb"],
  poweredByHeader: false,
};

export default nextConfig;
