/**
 * Bias sidewalk edge picks toward social / village anchors.
 */
import { pick, type Rng } from "../lib/rng.ts";
import type { PedEdge } from "./ped-edges.ts";

export type Anchor = { x: number; z: number };

/**
 * Sample a few random edges and keep the closest to any anchor (within maxD).
 * Returns null when bias should fall through to dense pick.
 */
export function pickEdgeNearAnchors(
  rng: Rng,
  edges: readonly PedEdge[],
  anchors: readonly Anchor[],
  chance: number,
  maxD: number,
  samples = 10,
): PedEdge | null {
  if (anchors.length === 0 || edges.length === 0 || rng() >= chance) return null;
  const a = pick(rng, anchors);
  let best = edges[0]!;
  let bestD = Infinity;
  for (let t = 0; t < samples; t += 1) {
    const e = pick(rng, edges);
    const mx = (e.ax + e.bx) * 0.5;
    const mz = (e.az + e.bz) * 0.5;
    const d = (mx - a.x) ** 2 + (mz - a.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return bestD < maxD * maxD ? best : null;
}
