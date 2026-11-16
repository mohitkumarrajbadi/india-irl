/**
 * Interest / LOD budgets for multiplayer scale.
 * Near peers stay silky; far peers stay cheap.
 * Distance tiers live in `@india-irl/network` (relay mirrors the same meters).
 */
export {
  INTEREST_NEAR_M as NEAR_M,
  INTEREST_MID_M as MID_M,
  INTEREST_NEAR_M2 as NEAR_M2,
  INTEREST_MID_M2 as MID_M2,
  lodTier,
  type LodTier,
} from "@india-irl/network";

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
