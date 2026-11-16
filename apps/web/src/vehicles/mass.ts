/** Vehicle mass classes for smash outcomes — sourced from physics-props. */
import type { TrafficKind } from "./traffic";
import { PLAYER_PHYSICS, TRAFFIC_PHYSICS } from "./physics-props.ts";
import { TRAFFIC_KIND_COUNT } from "./traffic-kinds.ts";

/** Player drive kinds: 1 auto, 2 bike, 3 cab. */
export const PLAYER_MASS: Record<1 | 2 | 3, number> = {
  1: PLAYER_PHYSICS[1].mass,
  2: PLAYER_PHYSICS[2].mass,
  3: PLAYER_PHYSICS[3].mass,
};

/** NPC traffic mass table — one entry per TrafficKind. */
export const TRAFFIC_MASS: Record<TrafficKind, number> = Object.fromEntries(
  Array.from({ length: TRAFFIC_KIND_COUNT }, (_, k) => [k, TRAFFIC_PHYSICS[k as TrafficKind].mass]),
) as Record<TrafficKind, number>;

export const WORLD_MASS = 50_000;

/**
 * Fraction of crash energy the lighter party absorbs (0…1).
 * Prefer `massHitScale` / `vehicleHitSeverity` in crash.ts for damage.
 */
export function selfSeverityScale(selfMass: number, otherMass: number): number {
  const t = otherMass / (selfMass + otherMass);
  return Math.min(1.15, Math.max(0.18, t * 1.7));
}

/** Share of separation push on self (heavy bodies move less). */
export function selfPushShare(selfMass: number, otherMass: number): number {
  return otherMass / (selfMass + otherMass);
}
