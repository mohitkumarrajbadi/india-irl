import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");
const isVercel = process.env.VERCEL === "1";
const relayUrl = process.env.NEXT_PUBLIC_RELAY_URL ?? "";

if (isVercel && !relayUrl) {
  console.warn(
    "[ommo] NEXT_PUBLIC_RELAY_URL is unset — multiplayer will fall back to same-browser only on this deploy.",
  );
}
if (isVercel && relayUrl.startsWith("ws://")) {
  console.warn(
    "[ommo] NEXT_PUBLIC_RELAY_URL uses ws:// on HTTPS — browsers will block it. Use wss://.",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Monorepo: trace workspace packages from the repo root on Vercel.
  outputFileTracingRoot: repoRoot,
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
