import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "three",
    "@india-irl/engine",
    "@india-irl/network",
    "@india-irl/mods",
    "@india-irl/shared",
  ],
  // Pin Turbopack to the monorepo root (home-dir package-lock would otherwise win).
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
