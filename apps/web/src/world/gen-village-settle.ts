/** Compact village hamlets along rural trails outside the urban grid. */
import { between, chance, pick, type Rng } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import type { Rect, TrailRoad, VillageSettlement } from "./types.ts";

const LABELS = ["Chai Thana", "Field Gate", "Old Well", "Banyan Square", "Bus Stand Hamlet"];

function hutColor(rng: Rng, palette: number[]): number {
  return pick(rng, palette);
}

/** Place up to `maxN` settlements mid-trail beyond city bounds. */
export function buildVillageSettlements(
  g: GenBuffers,
  trails: TrailRoad[],
  bounds: Rect,
  maxN = 2,
): VillageSettlement[] {
  const { rng, cfg } = g;
  const out: VillageSettlement[] = [];
  const villages = trails.filter((t) => t.kind === "village" && t.points.length >= 6);
  if (villages.length === 0) return out;

  for (const trail of villages) {
    if (out.length >= maxN) break;
    // Always place the first hamlet; later ones are optional
    if (out.length > 0 && !chance(rng, 0.7)) continue;
    const mi = Math.floor(trail.points.length * (0.55 + rng() * 0.15));
    const mid = trail.points[mi]!;
    const next = trail.points[Math.min(trail.points.length - 1, mi + 1)] ?? mid;
    const yaw = Math.atan2(next.x - mid.x, next.z - mid.z);
    const settle = placeHamlet(g, mid.x, mid.z, yaw, rng);
    settle.label = cfg.id === "mandipura" && chance(rng, 0.4) ? "Hillgate Hamlet" : pick(rng, LABELS);
    out.push(settle);
  }
  // Guarantee one hamlet if any village trail exists
  if (out.length === 0 && villages[0]) {
    const trail = villages[0];
    const mi = Math.floor(trail.points.length * 0.6);
    const mid = trail.points[mi]!;
    const next = trail.points[Math.min(trail.points.length - 1, mi + 1)] ?? mid;
    const yaw = Math.atan2(next.x - mid.x, next.z - mid.z);
    const settle = placeHamlet(g, mid.x, mid.z, yaw, rng);
    settle.label = pick(rng, LABELS);
    out.push(settle);
  }
  void bounds;
  return out;
}

function placeHamlet(
  g: GenBuffers,
  cx: number,
  cz: number,
  yaw: number,
  rng: Rng,
): VillageSettlement {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const huts: VillageSettlement["huts"] = [];
  const n = 4 + Math.floor(rng() * 4);
  const palette = g.old.length ? g.old : g.concrete;

  for (let i = 0; i < n; i += 1) {
    const ang = (i / n) * Math.PI * 2 + between(rng, -0.2, 0.2);
    const rad = between(rng, 7, 14);
    const lx = Math.cos(ang) * rad;
    const lz = Math.sin(ang) * rad;
    const x = cx + sin * lz + cos * lx;
    const z = cz + cos * lz - sin * lx;
    const w = between(rng, 3.2, 5.5);
    const d = between(rng, 3.0, 5.0);
    const h = between(rng, 2.4, 3.8);
    const rot = yaw + between(rng, -0.4, 0.4) + (chance(rng, 0.5) ? Math.PI / 2 : 0);
    huts.push({ x, z, w, d, h, rot, color: hutColor(rng, palette) });
    g.boxes.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      h,
    });
  }

  // Central chai stall + trees
  g.stalls.push({
    x: cx + sin * 2.5,
    z: cz + cos * 2.5,
    rot: yaw + Math.PI,
    s: 1,
    v: Math.floor(rng() * 4),
  });
  g.circles.push({ x: cx + sin * 2.5, z: cz + cos * 2.5, r: 1.1 });
  g.addTree(cx - sin * 4, cz - cos * 4, 1.15);
  g.addTree(cx + cos * 5, cz - sin * 5, 0.95);
  if (chance(rng, 0.6)) {
    g.cows.push({
      x: cx + cos * 8,
      z: cz - sin * 8,
      rot: yaw + between(rng, -1, 1),
      s: between(rng, 0.95, 1.1),
      v: Math.floor(rng() * 3),
    });
    g.circles.push({ x: cx + cos * 8, z: cz - sin * 8, r: 0.95 });
  }

  return { x: cx, z: cz, yaw, label: "Hamlet", huts };
}
