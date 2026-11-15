/** Sample region / height / grade / surface at a world point. */
import { clamp } from "../lib/math.ts";
import { blockAt } from "./gen-query.ts";
import { terrainProfile } from "./terrain-profile.ts";
import { onTrailRoad } from "./trail-query.ts";
import type { CityData } from "./types.ts";

export type TerrainRegion = "urban" | "suburban" | "hills" | "village" | "highway";
export type SurfaceKind = "asphalt" | "dirt" | "gravel" | "grass" | "mud";

export type TerrainSample = {
  y: number;
  /** Slope ∂y/∂x, ∂y/∂z (approx). */
  gradX: number;
  gradZ: number;
  region: TerrainRegion;
  surface: SurfaceKind;
  /** 0.55…1.15 tyre grip multiplier. */
  grip: number;
};

const GRIP: Record<SurfaceKind, number> = {
  asphalt: 1,
  gravel: 0.78,
  dirt: 0.72,
  grass: 0.65,
  mud: 0.52,
};

function hash2(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 0.017) * 43758.5453;
  return n - Math.floor(n);
}

function noise2(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** True on village tracks / hills / apron — sparse traffic & quiet life. */
export function isRuralAt(city: CityData, x: number, z: number): boolean {
  const r = regionAt(city, x, z);
  return r === "village" || r === "hills";
}

/** Classify playable region from city fabric + apron. */
export function regionAt(city: CityData, x: number, z: number): TerrainRegion {
  const { bounds, config } = city;
  const prof = terrainProfile(config.id);
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;
  const outside =
    x < bounds.minX - 2 || x > bounds.maxX + 2 || z < bounds.minZ - 2 || z > bounds.maxZ + 2;

  if (outside) {
    const dx = x - cx;
    const dz = z - cz;
    const toward = dx * prof.hillAx + dz * prof.hillAz;
    if (toward > 40) return "hills";
    return "village";
  }

  const b = blockAt(city, x, z);
  if (b.fringe || b.kind === "park") {
    const edge =
      b.bi <= 1 || b.bj <= 1 || b.bi >= config.cols - 2 || b.bj >= config.rows - 2;
    if (edge) return "village";
  }

  // Outer arterial corridors feel like ORR / highway
  const nearArt =
    Math.min(
      ...city.roadsX.filter((r) => r.arterial).map((r) => Math.abs(x - r.c) - r.half),
      ...city.roadsZ.filter((r) => r.arterial).map((r) => Math.abs(z - r.c) - r.half),
    ) < 1.5;
  const outer =
    b.bi <= 1 || b.bj <= 1 || b.bi >= config.cols - 2 || b.bj >= config.rows - 2;
  if (nearArt && outer) return "highway";

  if (b.kind === "tech" || b.kind === "cbd" || b.kind === "market" || b.kind === "old") return "urban";
  return "suburban";
}

function surfaceFor(region: TerrainRegion, onRoad: boolean): SurfaceKind {
  if (onRoad) {
    if (region === "village") return "gravel";
    if (region === "hills") return "asphalt";
    return "asphalt";
  }
  if (region === "village") return "dirt";
  if (region === "hills") return "gravel";
  if (region === "suburban") return "grass";
  return "asphalt";
}

function onCarriageway(city: CityData, x: number, z: number): boolean {
  for (const r of city.roadsX) if (Math.abs(x - r.c) <= r.half + 0.4) return true;
  for (const r of city.roadsZ) if (Math.abs(z - r.c) <= r.half + 0.4) return true;
  if (onTrailRoad(city, x, z)) return true;
  return false;
}

/** Height in metres. City fabric stays ~0; apron rises toward hills. */
export function heightAt(city: CityData, x: number, z: number): number {
  const { bounds, config } = city;
  const prof = terrainProfile(config.id);
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;

  let pad = 0;
  if (x < bounds.minX) pad = Math.max(pad, bounds.minX - x);
  if (x > bounds.maxX) pad = Math.max(pad, x - bounds.maxX);
  if (z < bounds.minZ) pad = Math.max(pad, bounds.minZ - z);
  if (z > bounds.maxZ) pad = Math.max(pad, z - bounds.maxZ);

  // Soft fringe lift inside edge park cells
  let fringe = 0;
  if (pad < 1) {
    try {
      const b = blockAt(city, x, z);
      if (b.fringe) fringe = 0.35 + noise2(x * 0.04, z * 0.04, config.seed) * 0.55;
    } catch {
      /* out of grid */
    }
  }

  if (pad <= 0) return fringe;

  const t = clamp(pad / Math.max(40, prof.apron * 0.35), 0, 1);
  const dx = x - cx;
  const dz = z - cz;
  const toward = Math.max(0, (dx * prof.hillAx + dz * prof.hillAz) / (Math.hypot(dx, dz) || 1));
  const ridge = t * t * (0.35 + toward * 0.65);
  const n =
    noise2(x * 0.012, z * 0.012, config.seed) * 0.55 +
    noise2(x * 0.035, z * 0.035, config.seed + 9) * 0.3 +
    noise2(x * 0.08, z * 0.08, config.seed + 17) * 0.15;
  return ridge * prof.hillRise * (0.55 + n * 0.7) + fringe;
}

export function sampleTerrain(city: CityData, x: number, z: number): TerrainSample {
  const eps = 1.6;
  const trail = onTrailRoad(city, x, z);
  const y = heightAt(city, x, z) + (trail ? 0.04 : 0);
  const yx = heightAt(city, x + eps, z);
  const yz = heightAt(city, x, z + eps);
  const gradX = (yx - heightAt(city, x, z)) / eps;
  const gradZ = (yz - heightAt(city, x, z)) / eps;
  let region = regionAt(city, x, z);
  if (trail?.trail.kind === "hill") region = "hills";
  else if (trail?.trail.kind === "village") region = "village";
  const road = !!trail || onCarriageway(city, x, z);
  let surface = surfaceFor(region, road);
  if (trail?.trail.kind === "village") surface = "dirt";
  if (trail?.trail.kind === "hill") surface = "asphalt";
  let grip = GRIP[surface];
  if (region === "hills" && Math.hypot(gradX, gradZ) > 0.12) grip *= 0.88;
  if (trail?.trail.kind === "hill") grip *= 0.94; // mountain asphalt
  if (region === "highway" && road && !trail) grip = Math.min(1.08, grip * 1.05);
  return { y, gradX, gradZ, region, surface, grip };
}

/** Forward slope (+ = uphill) given yaw. */
export function forwardGrade(sample: TerrainSample, yaw: number): number {
  return sample.gradX * Math.sin(yaw) + sample.gradZ * Math.cos(yaw);
}
