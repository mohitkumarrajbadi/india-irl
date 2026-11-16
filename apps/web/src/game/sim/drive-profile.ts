/**
 * Arcade vs Rapier drive step profiler.
 * Enable with `?driveProfile=1` (or localStorage `india-irl:driveProfile`).
 * Budgets gate promoting Rapier off the opt-in flag.
 */
import { readFeatureFlag } from "./flags.ts";

export type DriveAuthority = "arcade" | "rapier" | "fallback";

export type DriveProfileSnap = {
  authority: DriveAuthority;
  /** Rolling mean step ms for current authority lane. */
  meanMs: number;
  /** Approx p95 of recent samples. */
  p95Ms: number;
  /** Rapier flag on but arcade path ran (worker cold / missing entity). */
  fallbackRate: number;
  chunks: number;
  samples: number;
  /** True when Rapier lane meets ship-default budgets. */
  passesBudget: boolean;
};

const CAP = 120;
const arcadeMs: number[] = [];
const rapierMs: number[] = [];
let rapierAttempts = 0;
let rapierFallbacks = 0;
let lastAuthority: DriveAuthority = "arcade";
let lastChunks = 0;

/** Soft budgets — main-thread drive step only (not full frame). */
export const DRIVE_BUDGET = {
  /** Rapier step p95 should stay under this (ms). */
  rapierP95Ms: 2.8,
  /** Arcade baseline p95 ceiling for comparison. */
  arcadeP95Ms: 1.2,
  /** Max fraction of Rapier-intended frames that fell back to arcade. */
  maxFallbackRate: 0.08,
  /** Min samples before passesBudget is meaningful. */
  minSamples: 45,
} as const;

export function isDriveProfileEnabled(): boolean {
  return readFeatureFlag("driveProfile");
}

export function noteDriveStep(
  authority: DriveAuthority,
  ms: number,
  opts: { chunks?: number; wantedRapier?: boolean } = {},
): void {
  const t = Math.max(0, ms);
  lastAuthority = authority;
  if (opts.chunks != null) lastChunks = opts.chunks;

  if (opts.wantedRapier) {
    rapierAttempts += 1;
    if (authority !== "rapier") rapierFallbacks += 1;
  }

  if (authority === "rapier") push(rapierMs, t);
  else push(arcadeMs, t);
}

export function driveProfileSnap(): DriveProfileSnap {
  const lane = lastAuthority === "rapier" ? rapierMs : arcadeMs;
  const meanMs = mean(lane);
  const p95Ms = percentile(lane, 0.95);
  const fallbackRate = rapierAttempts > 0 ? rapierFallbacks / rapierAttempts : 0;
  const samples = lane.length;
  const passesBudget =
    rapierMs.length >= DRIVE_BUDGET.minSamples &&
    percentile(rapierMs, 0.95) <= DRIVE_BUDGET.rapierP95Ms &&
    fallbackRate <= DRIVE_BUDGET.maxFallbackRate;

  return {
    authority: lastAuthority,
    meanMs,
    p95Ms,
    fallbackRate,
    chunks: lastChunks,
    samples,
    passesBudget,
  };
}

/** Compact HUD line — empty when profiling off. */
export function driveProfileHudLine(): string {
  if (!isDriveProfileEnabled()) return "";
  const s = driveProfileSnap();
  const auth =
    s.authority === "rapier" ? "Rapier" : s.authority === "fallback" ? "Fallback" : "Arcade";
  const bud = s.samples >= DRIVE_BUDGET.minSamples ? (s.passesBudget ? "PASS" : "HOLD") : "…";
  return `${auth} ${s.meanMs.toFixed(2)}ms p95 ${s.p95Ms.toFixed(2)} · fb ${(s.fallbackRate * 100).toFixed(0)}% · ${s.chunks}ch · ${bud}`;
}

/** Test / session reset. */
export function resetDriveProfile(): void {
  arcadeMs.length = 0;
  rapierMs.length = 0;
  rapierAttempts = 0;
  rapierFallbacks = 0;
  lastAuthority = "arcade";
  lastChunks = 0;
}

function push(buf: number[], v: number): void {
  buf.push(v);
  if (buf.length > CAP) buf.shift();
}

function mean(buf: number[]): number {
  if (!buf.length) return 0;
  let s = 0;
  for (const v of buf) s += v;
  return s / buf.length;
}

/** Nearest-rank percentile on a copy (small CAP). */
export function percentile(buf: number[], p: number): number {
  if (!buf.length) return 0;
  const sorted = buf.slice().sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[i]!;
}
