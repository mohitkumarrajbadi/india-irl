/** Sparse shoulder posts — keep count low for StaticGrid / FPS. */
import type { GenBuffers } from "./gen-buffers.ts";
import type { TrailRoad } from "./types.ts";

export function addTrailColliders(g: GenBuffers, trails: TrailRoad[]): void {
  for (const trail of trails) {
    const pts = trail.points;
    const shoulder = trail.kind === "hill" ? trail.half + 0.55 : trail.half + 0.35;
    // Hill every 3rd seg, village every 4th — was 1–2 and flooded the grid
    const step = trail.kind === "hill" ? 3 : 4;
    for (let i = 0; i < pts.length - 1; i += step) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      g.circles.push({ x: a.x + px * shoulder, z: a.z + pz * shoulder, r: 0.3 });
      g.circles.push({ x: a.x - px * shoulder, z: a.z - pz * shoulder, r: 0.3 });
    }
  }
}
