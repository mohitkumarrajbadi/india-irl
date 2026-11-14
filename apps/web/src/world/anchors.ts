/** Hangout anchors derived from meet plazas (pure). */
import type { CityData } from "./types.ts";

export type HangoutAnchor = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

const REACH = 3.2;
export const ANCHOR_REACH2 = REACH * REACH;

/** Bench offsets around a meet center (local +X left, +Z forward). */
export function anchorsFromCity(city: CityData): HangoutAnchor[] {
  const out: HangoutAnchor[] = [];
  for (const m of city.meets) {
    const yaw = Math.PI / 2;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    // Two benches facing the plaza.
    for (const side of [-1, 1] as const) {
      const lx = side * 2.4;
      const lz = 1.8;
      out.push({
        id: `${m.spec.id}-bench-${side > 0 ? "a" : "b"}`,
        label: `${m.spec.label} bench`,
        x: m.x + lx * cos + lz * sin,
        y: 0,
        z: m.z - lx * sin + lz * cos,
        yaw: yaw + (side > 0 ? Math.PI : 0),
      });
    }
  }
  return out;
}

export function nearestAnchor(
  x: number,
  z: number,
  anchors: readonly HangoutAnchor[],
  radius2 = ANCHOR_REACH2,
): HangoutAnchor | null {
  let best: HangoutAnchor | null = null;
  let bd = radius2;
  for (const a of anchors) {
    const d = (a.x - x) ** 2 + (a.z - z) ** 2;
    if (d <= bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}
