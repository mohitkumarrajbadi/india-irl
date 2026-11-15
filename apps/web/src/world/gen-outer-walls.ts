/** Outer boundary walls with gates where village/hill trails leave the city. */
import type { GenBuffers } from "./gen-buffers.ts";
import type { Rect, TrailRoad } from "./types.ts";

type Gate = { t: number; half: number };

function mergeGates(gates: Gate[], minGap = 4): Gate[] {
  if (gates.length === 0) return [];
  const sorted = [...gates].sort((a, b) => a.t - b.t);
  const out: Gate[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i += 1) {
    const g = sorted[i]!;
    const last = out[out.length - 1]!;
    if (g.t - g.half <= last.t + last.half + minGap) {
      const lo = Math.min(last.t - last.half, g.t - g.half);
      const hi = Math.max(last.t + last.half, g.t + g.half);
      last.t = (lo + hi) * 0.5;
      last.half = (hi - lo) * 0.5;
    } else out.push({ ...g });
  }
  return out;
}

function collectGates(bounds: Rect, trails: TrailRoad[]): { w: Gate[]; e: Gate[]; s: Gate[]; n: Gate[] } {
  const w: Gate[] = [];
  const e: Gate[] = [];
  const s: Gate[] = [];
  const n: Gate[] = [];
  for (const trail of trails) {
    const half = trail.half + 7;
    for (const p of trail.points) {
      if (p.x < bounds.minX - 1) {
        w.push({ t: p.z, half });
        break;
      }
      if (p.x > bounds.maxX + 1) {
        e.push({ t: p.z, half });
        break;
      }
      if (p.z < bounds.minZ - 1) {
        s.push({ t: p.x, half });
        break;
      }
      if (p.z > bounds.maxZ + 1) {
        n.push({ t: p.x, half });
        break;
      }
    }
  }
  return { w: mergeGates(w), e: mergeGates(e), s: mergeGates(s), n: mergeGates(n) };
}

/** Emit wall boxes along [lo,hi] skipping gate openings. */
function segments(lo: number, hi: number, gates: Gate[]): { a: number; b: number }[] {
  const cuts = mergeGates(gates);
  const out: { a: number; b: number }[] = [];
  let cursor = lo;
  for (const g of cuts) {
    const g0 = g.t - g.half;
    const g1 = g.t + g.half;
    if (g0 > cursor + 2) out.push({ a: cursor, b: Math.min(g0, hi) });
    cursor = Math.max(cursor, g1);
  }
  if (hi > cursor + 2) out.push({ a: cursor, b: hi });
  return out;
}

export function pushOuterWalls(g: GenBuffers, bounds: Rect, trails: TrailRoad[] = []): void {
  const pad = 14;
  const deep = 80;
  const gates = collectGates(bounds, trails);
  const z0 = bounds.minZ - deep;
  const z1 = bounds.maxZ + deep;
  const x0 = bounds.minX - deep;
  const x1 = bounds.maxX + deep;

  // West
  for (const seg of segments(z0, z1, gates.w)) {
    g.boxes.push({ minX: bounds.minX - deep, maxX: bounds.minX - pad, minZ: seg.a, maxZ: seg.b, h: 0 });
  }
  // East
  for (const seg of segments(z0, z1, gates.e)) {
    g.boxes.push({ minX: bounds.maxX + pad, maxX: bounds.maxX + deep, minZ: seg.a, maxZ: seg.b, h: 0 });
  }
  // South
  for (const seg of segments(x0, x1, gates.s)) {
    g.boxes.push({ minX: seg.a, maxX: seg.b, minZ: bounds.minZ - deep, maxZ: bounds.minZ - pad, h: 0 });
  }
  // North
  for (const seg of segments(x0, x1, gates.n)) {
    g.boxes.push({ minX: seg.a, maxX: seg.b, minZ: bounds.maxZ + pad, maxZ: bounds.maxZ + deep, h: 0 });
  }
}
