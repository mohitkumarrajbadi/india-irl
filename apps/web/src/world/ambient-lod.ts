/**
 * Ambient life LOD by terrain region.
 *
 * Authority model (Phase 6):
 * - Traffic: interest-scoped host snapshot (`tr`) — lowest peer id publishes nearby fleet.
 * - Peds / animals: **local backdrop** — deterministic seed, no net sync. Peers see
 *   similar density near themselves, not identical agents.
 *
 * Village / hills stay sparse (village ≪ city). Urban / market stay dense.
 */
import { regionAt, type TerrainRegion } from "./terrain-sample.ts";
import type { CityData } from "./types.ts";

export type AmbientLod = {
  /** Pedestrian interest bubble (m). */
  pedBubble: number;
  /** Soft mid-range — beyond this, alternate-frame ped ticks. */
  pedMid: number;
  /** Traffic cull / respawn distance (m). */
  trafficCull: number;
  /** Host traffic snapshot range (m). */
  trafficSyncRange: number;
  /** Max agents in one host snapshot. */
  trafficSyncMax: number;
  /** Animal sleep distance (m). */
  animalBubble: number;
  /** Relative ambient density 0…1 (urban = 1). */
  density: number;
};

export const REGION_LOD: Record<TerrainRegion, AmbientLod> = {
  urban: {
    pedBubble: 160,
    pedMid: 75,
    trafficCull: 200,
    trafficSyncRange: 130,
    trafficSyncMax: 18,
    animalBubble: 120,
    density: 1,
  },
  suburban: {
    pedBubble: 130,
    pedMid: 65,
    trafficCull: 185,
    trafficSyncRange: 115,
    trafficSyncMax: 14,
    animalBubble: 110,
    density: 0.7,
  },
  highway: {
    pedBubble: 90,
    pedMid: 45,
    trafficCull: 220,
    trafficSyncRange: 150,
    trafficSyncMax: 16,
    animalBubble: 90,
    density: 0.4,
  },
  village: {
    pedBubble: 55,
    pedMid: 28,
    trafficCull: 150,
    trafficSyncRange: 85,
    trafficSyncMax: 6,
    animalBubble: 100,
    density: 0.18,
  },
  hills: {
    pedBubble: 45,
    pedMid: 24,
    trafficCull: 140,
    trafficSyncRange: 70,
    trafficSyncMax: 4,
    animalBubble: 80,
    density: 0.1,
  },
};

export function ambientLodAt(city: CityData, x: number, z: number): AmbientLod {
  return REGION_LOD[regionAt(city, x, z)];
}

/** Peds + animals are local-only; traffic uses interest-scoped host authority. */
export function isLocalAmbientBackdrop(kind: "ped" | "animal" | "traffic"): boolean {
  return kind !== "traffic";
}

/** Village ≪ city density ordering helper for tests / tuning. */
export function regionDensity(region: TerrainRegion): number {
  return REGION_LOD[region].density;
}
