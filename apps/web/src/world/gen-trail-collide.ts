/**
 * Trail shoulder / mountain guardrail colliders.
 * Hill: dense outer-side posts matching visual rails (+ downhill retainers).
 * Village: sparse both-side posts.
 */
import type { GenBuffers } from "./gen-buffers.ts";
import type { TrailRoad } from "./types.ts";

export function addTrailColliders(g: GenBuffers, trails: TrailRoad[]): void {
  for (const trail of trails) {
    if (trail.kind === "hill") addHillGuardrails(g, trail);
    else addVillagePosts(g, trail);
  }
}

function addVillagePosts(g: GenBuffers, trail: TrailRoad): void {
  const pts = trail.points;
  const shoulder = trail.half + 0.35;
  for (let i = 0; i < pts.length - 1; i += 4) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const { px, pz } = perp(a, b);
    g.circles.push({ x: a.x + px * shoulder, z: a.z + pz * shoulder, r: 0.3 });
    g.circles.push({ x: a.x - px * shoulder, z: a.z - pz * shoulder, r: 0.3 });
  }
}

/** Outer rail (+perp) denser; match trail-roads-build appendRails. */
function addHillGuardrails(g: GenBuffers, trail: TrailRoad): void {
  const pts = trail.points;
  const d = trail.half + 0.35;
  for (let i = 0; i < pts.length - 1; i += 2) {
    const a = pts[i]!;
    const b = pts[Math.min(i + 1, pts.length - 1)]!;
    const { px, pz } = perp(a, b);
    // Outer post (visual rail side)
    g.circles.push({ x: a.x + px * d, z: a.z + pz * d, r: 0.38 });
    // Thin AABB segment along the rail for continuous collide
    const ox0 = a.x + px * d;
    const oz0 = a.z + pz * d;
    const ox1 = b.x + px * d;
    const oz1 = b.z + pz * d;
    const pad = 0.22;
    g.boxes.push({
      minX: Math.min(ox0, ox1) - pad,
      maxX: Math.max(ox0, ox1) + pad,
      minZ: Math.min(oz0, oz1) - pad,
      maxZ: Math.max(oz0, oz1) + pad,
      h: 0.95,
    });
  }
  // Extra posts on sharp bends (hairpins)
  for (let i = 2; i < pts.length - 2; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const c = pts[i + 1]!;
    const d0 = Math.atan2(b.x - a.x, b.z - a.z);
    const d1 = Math.atan2(c.x - b.x, c.z - b.z);
    let turn = d1 - d0;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    if (Math.abs(turn) < 0.35) continue;
    const { px, pz } = perp(b, c);
    g.circles.push({ x: b.x + px * (d + 0.15), z: b.z + pz * (d + 0.15), r: 0.42 });
  }
}

function perp(
  a: { x: number; z: number },
  b: { x: number; z: number },
): { px: number; pz: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { px: -dz / len, pz: dx / len };
}
