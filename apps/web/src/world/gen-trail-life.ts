/** Village roadside life along dirt tracks — stalls, shrines, cattle; quiet hills. */
import { between, chance, type Rng } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import type { TrailRoad } from "./types.ts";

function sideOf(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  side: number,
  dist: number,
): { x: number; z: number; rot: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  return {
    x: ax + px * dist * side,
    z: az + pz * dist * side,
    rot: Math.atan2(dx, dz),
  };
}

/** Decorate village trails; leave hill roads sparse (viewpoint only). */
export function decorateTrailLife(g: GenBuffers, trails: TrailRoad[]): void {
  const { rng } = g;
  for (const trail of trails) {
    if (trail.kind === "hill") {
      decorateHill(g, trail, rng);
      continue;
    }
    decorateVillage(g, trail, rng);
  }
}

function decorateVillage(g: GenBuffers, trail: TrailRoad, rng: Rng): void {
  const pts = trail.points;
  for (let i = 2; i < pts.length - 2; i += 1) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const side = chance(rng, 0.5) ? 1 : -1;

    // Chai / fruit tapri every so often
    if (chance(rng, 0.18)) {
      const p = sideOf(a.x, a.z, b.x, b.z, side, trail.half + 2.8);
      g.stalls.push({ x: p.x, z: p.z, rot: p.rot + Math.PI, s: between(rng, 0.85, 1.05), v: Math.floor(rng() * 4) });
      g.circles.push({ x: p.x, z: p.z, r: 1.1 });
    } else if (chance(rng, 0.12)) {
      const p = sideOf(a.x, a.z, b.x, b.z, side, trail.half + 2.4);
      g.extras.push({ x: p.x, z: p.z, rot: p.rot, s: 1, v: 0 }); // fruit cart
      g.circles.push({ x: p.x, z: p.z, r: 0.9 });
    }

    // Roadside shrine
    if (chance(rng, 0.1)) {
      const p = sideOf(a.x, a.z, b.x, b.z, -side, trail.half + 2.2);
      g.extras.push({ x: p.x, z: p.z, rot: p.rot, s: between(rng, 0.9, 1.1), v: 2 });
      g.circles.push({ x: p.x, z: p.z, r: 0.7 });
    }

    // Grazing cow on the verge (village, not pack of strays)
    if (chance(rng, 0.14)) {
      const p = sideOf(a.x, a.z, b.x, b.z, side, trail.half + between(rng, 4, 9));
      g.cows.push({
        x: p.x,
        z: p.z,
        rot: p.rot + between(rng, -0.8, 0.8),
        s: between(rng, 0.95, 1.15),
        v: Math.floor(rng() * 3),
      });
      g.circles.push({ x: p.x, z: p.z, r: 0.95 });
    }

    // Occasional goat; almost never dogs on the village track
    if (chance(rng, 0.08)) {
      const p = sideOf(a.x, a.z, b.x, b.z, -side, trail.half + between(rng, 3.5, 7));
      g.strays.push({
        x: p.x,
        z: p.z,
        rot: between(rng, 0, Math.PI * 2),
        s: between(rng, 0.9, 1.15),
        v: Math.floor(rng() * 3),
        kind: 1,
      });
      g.circles.push({ x: p.x, z: p.z, r: 0.4 });
    }

    // Extra shade trees
    if (chance(rng, 0.22)) {
      const p = sideOf(a.x, a.z, b.x, b.z, side, trail.half + between(rng, 5, 11));
      g.addTree(p.x, p.z, between(rng, 0.9, 1.35));
    }
  }
}

function decorateHill(g: GenBuffers, trail: TrailRoad, rng: Rng): void {
  const pts = trail.points;
  // One shrine / viewpoint near the start, then quiet climb
  if (pts.length > 4) {
    const a = pts[2]!;
    const b = pts[3]!;
    const p = sideOf(a.x, a.z, b.x, b.z, 1, trail.half + 3);
    g.extras.push({ x: p.x, z: p.z, rot: p.rot, s: 1.05, v: 2 });
    g.circles.push({ x: p.x, z: p.z, r: 0.7 });
  }
  // Sparse trees only — no cattle packs, no dog packs on the ghats
  for (let i = 5; i < pts.length - 2; i += 4) {
    if (!chance(rng, 0.35)) continue;
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const p = sideOf(a.x, a.z, b.x, b.z, chance(rng, 0.5) ? 1 : -1, trail.half + between(rng, 6, 14));
    g.addTree(p.x, p.z, between(rng, 0.7, 1.1));
  }
}
