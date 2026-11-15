/** Village dirt tracks + switchback hill approach roads beyond the grid. */
import { between, chance, type Rng } from "../lib/rng.ts";
import { terrainProfile } from "./terrain-profile.ts";
import type { Block, CityConfig, Rect, RoadLine, TrailRoad } from "./types.ts";

function pushPoint(pts: { x: number; z: number }[], x: number, z: number): void {
  const last = pts[pts.length - 1];
  if (last && Math.hypot(last.x - x, last.z - z) < 2.5) return;
  pts.push({ x, z });
}

/** Serpentine dirt track leaving a fringe edge into the village apron. */
function villageTrack(
  rng: Rng,
  sx: number,
  sz: number,
  ox: number,
  oz: number,
  len: number,
): TrailRoad {
  const pts: { x: number; z: number }[] = [];
  const perpX = -oz;
  const perpZ = ox;
  let x = sx;
  let z = sz;
  pushPoint(pts, x, z);
  const steps = Math.max(8, Math.floor(len / 9));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const wobble = Math.sin(t * Math.PI * (2.2 + rng() * 1.4) + rng() * 2) * (4 + rng() * 5);
    x = sx + ox * (len * t) + perpX * wobble;
    z = sz + oz * (len * t) + perpZ * wobble;
    pushPoint(pts, x, z);
  }
  return { kind: "village", half: between(rng, 1.9, 2.4), points: pts };
}

/** Hairpin hill climb toward highland. */
function hillClimb(
  rng: Rng,
  sx: number,
  sz: number,
  hillAx: number,
  hillAz: number,
  climb: number,
): TrailRoad {
  const pts: { x: number; z: number }[] = [];
  const hx = hillAx;
  const hz = hillAz;
  const inv = 1 / (Math.hypot(hx, hz) || 1);
  const ax = hx * inv;
  const az = hz * inv;
  const px = -az;
  const pz = ax;
  let x = sx;
  let z = sz;
  pushPoint(pts, x, z);
  let side = chance(rng, 0.5) ? 1 : -1;
  let along = 0;
  const step = 10;
  while (along < climb) {
    along += step;
    // Switchback every ~55 m
    if (along % 55 < step) side *= -1;
    const sweep = side * (9 + rng() * 7) * Math.sin((along / 55) * Math.PI);
    // Mild grade: advance mostly toward hills with lateral hairpin
    x += ax * step * 0.85 + px * sweep * 0.35;
    z += az * step * 0.85 + pz * sweep * 0.35;
    // Extra kink mid-hairpin
    if (along % 55 > 20 && along % 55 < 35) {
      x += px * side * 3.5;
      z += pz * side * 3.5;
    }
    pushPoint(pts, x, z);
  }
  return { kind: "hill", half: between(rng, 2.8, 3.4), points: pts };
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

  // Village exits: fringe cells on each edge → dirt track outward
  const edgeExits: { x: number; z: number; ox: number; oz: number }[] = [];
  for (const b of fringe) {
    if (b.bi === 0) edgeExits.push({ x: b.minX - 1, z: (b.minZ + b.maxZ) * 0.5, ox: -1, oz: 0 });
    if (b.bi === cfg.cols - 1) edgeExits.push({ x: b.maxX + 1, z: (b.minZ + b.maxZ) * 0.5, ox: 1, oz: 0 });
    if (b.bj === 0) edgeExits.push({ x: (b.minX + b.maxX) * 0.5, z: b.minZ - 1, ox: 0, oz: -1 });
    if (b.bj === cfg.rows - 1) edgeExits.push({ x: (b.minX + b.maxX) * 0.5, z: b.maxZ + 1, ox: 0, oz: 1 });
  }
  // Dedupe roughly + sample
  const used = new Set<string>();
  let villageCount = 0;
  for (const e of edgeExits) {
    if (villageCount >= (cfg.id === "gurugram" ? 4 : 7)) break;
    const key = `${Math.round(e.x / 40)},${Math.round(e.z / 40)}`;
    if (used.has(key)) continue;
    if (!chance(rng, 0.55)) continue;
    used.add(key);
    trails.push(villageTrack(rng, e.x, e.z, e.ox, e.oz, between(rng, 90, 170)));
    villageCount += 1;
  }

  // Cross-links through fringe parks (short dirt connectors)
  for (let i = 0; i < fringe.length && villageCount < 10; i += 1) {
    if (!chance(rng, 0.22)) continue;
    const b = fringe[i]!;
    const sx = b.minX + 4;
    const sz = (b.minZ + b.maxZ) * 0.5;
    trails.push(villageTrack(rng, sx, sz, 1, (rng() - 0.5) * 0.4, between(rng, 40, 70)));
    villageCount += 1;
  }

  // Hill climb from the highland-facing edge
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;
  // Pick boundary point most aligned with hill direction
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
  // Snap start toward nearest arterial for a clear approach
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

  const climbLen = cfg.id === "gurugram" ? 120 : cfg.id === "bengaluru" ? 320 : 260;
  trails.push(hillClimb(rng, sx, sz, prof.hillAx, prof.hillAz, climbLen));
  // Secondary shorter hill spur
  if (cfg.id !== "gurugram" && chance(rng, 0.7)) {
    trails.push(
      hillClimb(
        rng,
        sx + (rng() - 0.5) * 50,
        sz + (rng() - 0.5) * 50,
        prof.hillAx,
        prof.hillAz,
        climbLen * 0.55,
      ),
    );
  }

  return trails.filter((t) => t.points.length >= 3);
}
