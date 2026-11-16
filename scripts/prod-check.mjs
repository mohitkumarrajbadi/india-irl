#!/usr/bin/env node
/**
 * Pre-deploy sanity checks for OMMO production.
 * Usage: npm run prod:check
 * With relay URL: NEXT_PUBLIC_RELAY_URL=wss://… npm run prod:check
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warns = [];

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function warn(msg) {
  warns.push(msg);
  console.warn(`  ⚠ ${msg}`);
}
function fail(msg) {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
}

console.log("OMMO production readiness\n");

console.log("1. Files");
for (const f of [
  "apps/web/next.config.ts",
  "server/relay.mjs",
  "server/Dockerfile",
  "fly.relay.toml",
  "server/package.json",
  ".dockerignore",
  "vercel.json",
  ".env.example",
  "docs/DEPLOY-FRIENDS.md",
]) {
  if (existsSync(path.join(root, f))) ok(f);
  else fail(`missing ${f}`);
}

console.log("\n2. Env");
const relay = process.env.NEXT_PUBLIC_RELAY_URL || "";
if (!relay) {
  warn("NEXT_PUBLIC_RELAY_URL unset (required on Vercel for cross-device multiplayer)");
} else if (relay.startsWith("ws://") && !relay.includes("localhost")) {
  fail(`NEXT_PUBLIC_RELAY_URL must be wss:// in production (got ${relay})`);
} else if (relay.startsWith("wss://")) {
  ok(`NEXT_PUBLIC_RELAY_URL=${relay}`);
} else if (relay.startsWith("ws://localhost") || relay.startsWith("ws://127.")) {
  ok(`local relay URL ${relay}`);
} else {
  warn(`unexpected relay URL shape: ${relay}`);
}

if (process.env.ALLOWED_ORIGINS) ok(`ALLOWED_ORIGINS set`);
else warn("ALLOWED_ORIGINS empty — set after frontend URL is known");

console.log("\n3. Typecheck");
{
  const r = spawnSync("npm", ["run", "typecheck"], { cwd: root, encoding: "utf8", shell: true });
  if (r.status === 0) ok("typecheck");
  else fail(`typecheck failed\n${r.stdout || ""}\n${r.stderr || ""}`);
}

console.log("\n4. Production build");
{
  const r = spawnSync("npm", ["run", "build"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (r.status === 0) ok("npm run build");
  else fail(`build failed\n${(r.stdout || "").slice(-2000)}\n${(r.stderr || "").slice(-1000)}`);
}

console.log("\n---");
if (errors.length) {
  console.error(`FAILED (${errors.length} error(s), ${warns.length} warning(s))`);
  process.exit(1);
}
console.log(`READY (${warns.length} warning(s))`);
console.log("Next: follow docs/DEPLOY-FRIENDS.md — deploy relay, then Vercel with NEXT_PUBLIC_RELAY_URL.");
process.exit(0);
