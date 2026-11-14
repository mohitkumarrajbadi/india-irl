/**
 * Interest / LOD budgets for multiplayer scale.
 * Near peers stay silky; far peers stay cheap.
 */

/** Full-rate updates inside this radius (m). */
export const NEAR_M = 90;
/** Mid-rate (throttled) up to this radius (m). */
export const MID_M = 200;

export const NEAR_M2 = NEAR_M * NEAR_M;
export const MID_M2 = MID_M * MID_M;

export type LodTier = "near" | "mid" | "far" | "culled";

export function lodTier(dist2: number, cullM: number): LodTier {
  if (dist2 > cullM * cullM) return "culled";
  if (dist2 > MID_M2) return "far";
  if (dist2 > NEAR_M2) return "mid";
  return "near";
}

/**
 * How often we publish our own state.
 * More peers in the room → slightly slower idle heartbeats to spare the relay.
 */
export function sendIntervalSec(opts: {
  changed: boolean;
  speed: number;
  vehicle: number;
  emote: number;
  peerCount: number;
}): number {
  const busy = opts.peerCount > 24;
  if (!opts.changed) return busy ? 1.1 : 0.7;
  if (opts.vehicle > 0 || Math.abs(opts.speed) > 3.5) return busy ? 0.1 : 0.075;
  if (Math.abs(opts.speed) > 0.4 || opts.emote > 0) return busy ? 0.12 : 0.09;
  return busy ? 0.35 : 0.25;
}
