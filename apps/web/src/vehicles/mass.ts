/** Vehicle mass classes for smash outcomes (kg, approximate). */
import type { TrafficKind } from "./traffic";

/** Player drive kinds: 1 auto, 2 bike, 3 cab. */
export const PLAYER_MASS: Record<1 | 2 | 3, number> = {
  1: 420,
  2: 140,
  3: 1200,
};

/** NPC traffic: 0 auto, 1 bike, 2 car, 3 bus, 4 truck. */
export const TRAFFIC_MASS: Record<TrafficKind, number> = {
  0: 420,
  1: 140,
  2: 1200,
  3: 9000,
  4: 7000,
};

export const WORLD_MASS = 50_000;

/**
 * Fraction of crash energy the lighter party absorbs (0…1).
 * Prefer `massHitScale` / `vehicleHitSeverity` in crash.ts for damage.
 */
export function selfSeverityScale(selfMass: number, otherMass: number): number {
  const t = otherMass / (selfMass + otherMass);
  // Keep for callers; gentler than old ×2.05 curve
  return Math.min(1.15, Math.max(0.18, t * 1.7));
}

/** Share of separation push on self (heavy bodies move less). */
export function selfPushShare(selfMass: number, otherMass: number): number {
  return otherMass / (selfMass + otherMass);
}
