import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["three"],
  // A package-lock.json sits in the home directory. Pin the root so Turbopack
  // watches this repo instead of walking up to it.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
