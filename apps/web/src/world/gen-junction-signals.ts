/** Traffic signals at junction corners — arm hangs over the carriageway. */
import type { GenBuffers } from "./gen-buffers.ts";
import type { Rect } from "./types.ts";

const CURB = 0.55; // metres past the road edge onto the sidewalk

/**
 * Place poles at arterial junctions.
 * Arterial × arterial → 4 corners; arterial × minor → 2 poles on the arterial sides.
 * `rot` faces the junction so trafficSignal() local +Z hangs over the road.
 */
export function placeJunctionSignals(g: GenBuffers, bounds: Rect): void {
  const { xs, zs, roadsX, roadsZ, cfg } = g;
  const { cols, rows } = cfg;

  for (let i = 0; i <= cols; i += 1) {
    for (let j = 0; j <= rows; j += 1) {
      const rx = roadsX[i];
      const rz = roadsZ[j];
      if (!rx.arterial && !rz.arterial) continue;

      const cx = xs[i];
      const cz = zs[j];
      const hx = rx.half;
      const hz = rz.half;
      const poles: { x: number; z: number; rot: number }[] = [];

      if (rx.arterial && rz.arterial) {
        poles.push(
          { x: cx + hx + CURB, z: cz + hz + CURB, rot: Math.atan2(-1, -1) },
          { x: cx - hx - CURB, z: cz + hz + CURB, rot: Math.atan2(1, -1) },
          { x: cx + hx + CURB, z: cz - hz - CURB, rot: Math.atan2(-1, 1) },
          { x: cx - hx - CURB, z: cz - hz - CURB, rot: Math.atan2(1, 1) },
        );
      } else if (rx.arterial) {
        // N–S arterial: poles on E/W sidewalks just south of the crossing
        poles.push(
          { x: cx + hx + CURB, z: cz + hz + CURB, rot: Math.atan2(-1, 0) },
          { x: cx - hx - CURB, z: cz + hz + CURB, rot: Math.atan2(1, 0) },
        );
      } else {
        // E–W arterial: poles on N/S sidewalks just east of the crossing
        poles.push(
          { x: cx + hx + CURB, z: cz + hz + CURB, rot: Math.atan2(0, -1) },
          { x: cx + hx + CURB, z: cz - hz - CURB, rot: Math.atan2(0, 1) },
        );
      }

      for (const p of poles) {
        if (p.x < bounds.minX + 1 || p.x > bounds.maxX - 1) continue;
        if (p.z < bounds.minZ + 1 || p.z > bounds.maxZ - 1) continue;
        g.extras.push({ x: p.x, z: p.z, rot: p.rot, s: 1, v: 6 });
        g.circles.push({ x: p.x, z: p.z, r: 0.35 });
      }
    }
  }
}
