/**
 * Pure token bucket — mirrors relay WS ingress (`max=80`, refill `50/s`).
 */

export type TokenBucket = {
  tokens: number;
  max: number;
  /** Tokens added per second. */
  refillPerSec: number;
  /** Last refill timestamp (ms). */
  lastMs: number;
};

export function createTokenBucket(
  max = 80,
  refillPerSec = 50,
  nowMs = 0,
): TokenBucket {
  return { tokens: max, max, refillPerSec, lastMs: nowMs };
}

/** Accrue tokens for elapsed wall time. */
export function refillBucket(b: TokenBucket, nowMs: number): void {
  const dt = Math.max(0, nowMs - b.lastMs) / 1000;
  if (dt <= 0) return;
  b.tokens = Math.min(b.max, b.tokens + dt * b.refillPerSec);
  b.lastMs = nowMs;
}

/** Try to spend one token. Returns false when empty. */
export function tryConsume(b: TokenBucket, cost = 1): boolean {
  if (b.tokens < cost) return false;
  b.tokens -= cost;
  return true;
}

/** Partial refund (e.g. voice ICE candidates). */
export function refund(b: TokenBucket, amount = 1): void {
  b.tokens = Math.min(b.max, b.tokens + amount);
}
