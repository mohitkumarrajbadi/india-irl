/** Village single-carriageway + mountain switchbacks beyond the city grid. */
import { between, chance, type Rng } from "../lib/rng.ts";
import { terrainProfile } from "./terrain-profile.ts";
import type { Block, CityConfig, Rect, RoadLine, TrailRoad } from "./types.ts";

function pushPoint(pts: { x: number; z: number }[], x: number, z: number, min = 3.2): void {
  const last = pts[pts.length - 1];
  if (last && Math.hypot(last.x - x, last.z - z) < min) return;
  pts.push({ x, z });
}

/** Narrow rural asphalt / dirt — single carriageway, natural wobble. */
function villageTrack(
  rng: Rng,
  sx: number,
  sz: number,
  ox: number,
  oz: number,
  len: number,
  narrow: boolean,
): TrailRoad {
  const pts: { x: number; z: number }[] = [];
  const perpX = -oz;
  const perpZ = ox;
  pushPoint(pts, sx, sz, 0);
  const steps = Math.max(10, Math.floor(len / 7));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    // Gentle S-curves — not ruler-straight
    const wobble =
      Math.sin(t * Math.PI * (1.6 + rng() * 1.2) + rng()) * (3 + rng() * 4) +
      Math.sin(t * Math.PI * 4.5) * 1.2;
    const x = sx + ox * (len * t) + perpX * wobble;
    const z = sz + oz * (len * t) + perpZ * wobble;
    pushPoint(pts, x, z);
  }
  // Village: ~3–4 m asphalt (half 1.5–2.0); farm connector even tighter
  const half = narrow ? between(rng, 1.35, 1.65) : between(rng, 1.55, 2.05);
  return { kind: "village", half, points: pts };
}

/** Dense hairpin climb — slow advance, wide lateral sweeps (Nandi / Ghats). */
function hillClimb(
  rng: Rng,
  sx: number,
  sz: number,
  hillAx: number,
  hillAz: number,
  climb: number,
): TrailRoad {
  const pts: { x: number; z: number }[] = [];
  const inv = 1 / (Math.hypot(hillAx, hillAz) || 1);
  const ax = hillAx * inv;
  const az = hillAz * inv;
  const px = -az;
  const pz = ax;
  let x = sx;
  let z = sz;
  pushPoint(pts, x, z, 0);
  let side = chance(rng, 0.5) ? 1 : -1;
  let along = 0;
  const step = 7;
  const period = 48; // shorter = more hairpins
  while (along < climb) {
    along += step;
    const phase = (along % period) / period;
    if (phase < step / period) side *= -1;
    // Strong lateral sweep at hairpin apex
    const sweepAmp = 11 + rng() * 6;
    const sweep = side * sweepAmp * Math.sin(phase * Math.PI);
    const advance = 0.55 + 0.35 * (1 - Math.sin(phase * Math.PI)); // slow through bend
    x += ax * step * advance + px * sweep * 0.42;
    z += az * step * advance + pz * sweep * 0.42;
    if (phase > 0.35 && phase < 0.65) {
      x += px * side * 4.5;
      z += pz * side * 4.5;
    }
    pushPoint(pts, x, z, 2.8);
  }
  return { kind: "hill", half: between(rng, 2.6, 3.2), points: pts };
}

export function buildTrailRoads(
  cfg: CityConfig,
  bounds: Rect,
  blocks: Block[],
  roadsX: RoadLine[],
  roadsZ: RoadLine[],
  xs: number[],
  zs: number[],
  rng: Rng,
): TrailRoad[] {
  const trails: TrailRoad[] = [];
  const prof = terrainProfile(cfg.id);
  const fringe = blocks.filter((b) => b.fringe);

  const edgeExits: { x: number; z: number; ox: number; oz: number }[] = [];
  for (const b of fringe) {
    if (b.bi === 0) edgeExits.push({ x: b.minX - 1, z: (b.minZ + b.maxZ) * 0.5, ox: -1, oz: 0 });
    if (b.bi === cfg.cols - 1) edgeExits.push({ x: b.maxX + 1, z: (b.minZ + b.maxZ) * 0.5, ox: 1, oz: 0 });
    if (b.bj === 0) edgeExits.push({ x: (b.minX + b.maxX) * 0.5, z: b.minZ - 1, ox: 0, oz: -1 });
    if (b.bj === cfg.rows - 1) edgeExits.push({ x: (b.minX + b.maxX) * 0.5, z: b.maxZ + 1, ox: 0, oz: 1 });
  }

  const used = new Set<string>();
  let villageCount = 0;
  const maxV = cfg.id === "gurugram" ? 5 : 8;
  for (const e of edgeExits) {
    if (villageCount >= maxV) break;
    const key = `${Math.round(e.x / 40)},${Math.round(e.z / 40)}`;
    if (used.has(key)) continue;
    if (!chance(rng, 0.6)) continue;
    used.add(key);
    trails.push(villageTrack(rng, e.x, e.z, e.ox, e.oz, between(rng, 110, 200), false));
    villageCount += 1;
  }

  // Farm connectors (very narrow)
  for (let i = 0; i < fringe.length && villageCount < maxV + 4; i += 1) {
    if (!chance(rng, 0.28)) continue;
    const b = fringe[i]!;
    trails.push(
      villageTrack(rng, b.minX + 4, (b.minZ + b.maxZ) * 0.5, 1, (rng() - 0.5) * 0.5, between(rng, 45, 85), true),
    );
    villageCount += 1;
  }

  // Link two village trails with a T-spur when possible
  if (trails.length >= 2 && chance(rng, 0.7)) {
    const a = trails[0]!;
    const b = trails[1]!;
    const pa = a.points[Math.floor(a.points.length * 0.45)]!;
    const pb = b.points[Math.floor(b.points.length * 0.4)]!;
    const link: TrailRoad = { kind: "village", half: between(rng, 1.4, 1.7), points: [] };
    const steps = 8;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      link.points.push({
        x: pa.x + (pb.x - pa.x) * t + Math.sin(t * Math.PI) * 3,
        z: pa.z + (pb.z - pa.z) * t,
      });
    }
    trails.push(link);
  }

  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;
  const candidates = [
    { x: cx, z: bounds.minZ - 2 },
    { x: cx, z: bounds.maxZ + 2 },
    { x: bounds.minX - 2, z: cz },
    { x: bounds.maxX + 2, z: cz },
  ];
  let best = candidates[0]!;
  let bestDot = -Infinity;
  for (const c of candidates) {
    const dx = c.x - cx;
    const dz = c.z - cz;
    const d = Math.hypot(dx, dz) || 1;
    const dot = (dx / d) * prof.hillAx + (dz / d) * prof.hillAz;
    if (dot > bestDot) {
      bestDot = dot;
      best = c;
    }
  }
  let sx = best.x;
  let sz = best.z;
  let bestD = Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    if (!roadsX[i]?.arterial) continue;
    const d = Math.abs(xs[i]! - best.x) + Math.abs((best.z < cz ? zs[0]! : zs[zs.length - 1]!) - best.z);
    if (d < bestD) {
      bestD = d;
      sx = xs[i]!;
      sz = best.z;
    }
  }
  for (let j = 0; j < zs.length; j += 1) {
    if (!roadsZ[j]?.arterial) continue;
    const d = Math.abs(zs[j]! - best.z) + Math.abs((best.x < cx ? xs[0]! : xs[xs.length - 1]!) - best.x);
    if (d < bestD) {
      bestD = d;
      sx = best.x;
      sz = zs[j]!;
    }
  }

  const climbLen = cfg.id === "gurugram" ? 140 : cfg.id === "bengaluru" ? 360 : 280;
  trails.push(hillClimb(rng, sx, sz, prof.hillAx, prof.hillAz, climbLen));
  if (cfg.id !== "gurugram") {
    trails.push(hillClimb(rng, sx + (rng() - 0.5) * 40, sz + (rng() - 0.5) * 40, prof.hillAx, prof.hillAz, climbLen * 0.6));
  }

  return trails.filter((t) => t.points.length >= 4);
}
