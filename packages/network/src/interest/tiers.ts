/**
 * Shared interest / fan-out distance tiers (client publish + relay mirror).
 * Relay `server/relay.mjs` keeps the same NEAR/MID meters — update both.
 */

export const INTEREST_NEAR_M = 90;
export const INTEREST_MID_M = 200;

export const INTEREST_NEAR_M2 = INTEREST_NEAR_M * INTEREST_NEAR_M;
export const INTEREST_MID_M2 = INTEREST_MID_M * INTEREST_MID_M;

/** Relay mid-ring send gap (ms). */
export const INTEREST_MID_GAP_MS = 220;
/** Relay far-ring send gap (ms). */
export const INTEREST_FAR_GAP_MS = 1100;

export type InterestTier = {
  nearM: number;
  midM: number;
  midGapMs: number;
  farGapMs: number;
};

export const INTEREST_TIERS: InterestTier = {
  nearM: INTEREST_NEAR_M,
  midM: INTEREST_MID_M,
  midGapMs: INTEREST_MID_GAP_MS,
  farGapMs: INTEREST_FAR_GAP_MS,
};

export type LodTier = "near" | "mid" | "far" | "culled";

export function lodTier(dist2: number, cullM: number): LodTier {
  if (dist2 > cullM * cullM) return "culled";
  if (dist2 > INTEREST_MID_M2) return "far";
  if (dist2 > INTEREST_NEAR_M2) return "mid";
  return "near";
}
