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
    // Plaza ring — denser hangout seating for social freeroam.
    const seats: { lx: number; lz: number; side: number; tag: string }[] = [
      { lx: -2.4, lz: 1.8, side: -1, tag: "a" },
      { lx: 2.4, lz: 1.8, side: 1, tag: "b" },
      { lx: -2.6, lz: -1.6, side: -1, tag: "c" },
      { lx: 2.6, lz: -1.6, side: 1, tag: "d" },
      { lx: 0, lz: 3.2, side: 0, tag: "e" },
    ];
    for (const s of seats) {
      out.push({
        id: `${m.spec.id}-bench-${s.tag}`,
        label: `${m.spec.label} bench`,
        x: m.x + s.lx * cos + s.lz * sin,
        y: 0,
        z: m.z - s.lx * sin + s.lz * cos,
        yaw: yaw + (s.side > 0 ? Math.PI : s.side < 0 ? 0 : Math.PI / 2),
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
