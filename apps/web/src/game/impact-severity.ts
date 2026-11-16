/**
 * Shared IMPACT → severity mapping for arcade walls and Rapier drive hits.
 * Keeps bike separation thresholds consistent across both authorities.
 */
import { vehicleHitSeverity } from "./crash.ts";
import { PLAYER_MASS } from "../vehicles/mass.ts";

/** World / static obstacle mass used for wall-style Rapier impacts. */
export const WORLD_IMPACT_MASS = 50_000;

/**
 * Severity from a Rapier IMPACT (sudden speed loss into world / obstacle).
 * Uses the same vehicleHitSeverity mass curve as traffic so bikes separate earlier.
 */
export function severityFromRapierImpact(
  kind: 1 | 2 | 3,
  speed: number,
  fx: number,
  fz: number,
): { sev: number; nx: number; nz: number; closing: number; otherMass: number } {
  const closing = Math.abs(speed);
  const len = Math.hypot(fx, fz);
  const nx = len > 1e-4 ? fx / len : 0;
  const nz = len > 1e-4 ? fz / len : 1;
  // Soften when impact vector is short relative to travel speed (glancing)
  const glance = Math.max(0, Math.min(0.55, 1 - Math.min(1, len / Math.max(1, closing))));
  const sev = vehicleHitSeverity(closing, PLAYER_MASS[kind], WORLD_IMPACT_MASS, glance * 0.35);
  return { sev, nx, nz, closing, otherMass: WORLD_IMPACT_MASS };
}

/** Severity helper for tests / traffic that already has closing + masses. */
export function severityFromClosing(
  closing: number,
  selfMass: number,
  otherMass: number,
  glance = 0,
): number {
  return vehicleHitSeverity(closing, selfMass, otherMass, glance);
}
