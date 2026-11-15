/** Sidewalk ring props for one block edge. */
import { between, chance, type Rng } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import { LOTS } from "./gen-constants.ts";
import type { Edge } from "./gen-edges.ts";
import type { Block } from "./types.ts";

export function fillStreetEdge(g: GenBuffers, b: Block, e: Edge): void {
  const { rng, cfg } = g;
  const rot = Math.atan2(e.ox, e.oz);
  const treeP = b.kind === "park" ? 0.9 : b.kind === "landmark" || b.kind === "lake" ? 0.5 : LOTS[b.kind].trees;

  for (let s = between(rng, 6, 9); s < e.len - 6; s += between(rng, 10, 15)) {
    if (chance(rng, treeP)) g.addTree(e.x + e.ax * s + e.ox * 0.4, e.z + e.az * s + e.oz * 0.4);
  }
  const lampGap = e.road.arterial ? 28 : 38;
  for (let s = lampGap / 2; s < e.len - 5; s += lampGap) {
    if (e.road.arterial || chance(rng, 0.7)) {
      g.lamps.push({ x: e.x + e.ax * s + e.ox * 0.7, z: e.z + e.az * s + e.oz * 0.7, rot });
    }
  }

  const mid = e.len * between(rng, 0.3, 0.7);
  const px = e.x + e.ax * mid;
  const pz = e.z + e.az * mid;
  if (e.road.arterial && chance(rng, 0.55) && b.kind !== "park") {
    g.busStops.push({ x: px + e.ox * 0.2, z: pz + e.oz * 0.2, rot, s: 1, v: 0 });
    const quarter = Math.abs(e.ox) > 0.5;
    g.boxes.push({
      minX: px - (quarter ? 0.8 : 1.7),
      maxX: px + (quarter ? 0.8 : 1.7),
      minZ: pz - (quarter ? 1.7 : 0.8),
      maxZ: pz + (quarter ? 1.7 : 0.8),
      h: 2.6,
    });
  }
  if ((b.kind === "market" || b.kind === "old") && chance(rng, 0.5)) {
    const s2 = e.len * between(rng, 0.15, 0.85);
    // Keep stalls on the sidewalk — do not spill into the carriageway
    const sx = e.x + e.ax * s2 + e.ox * 0.35;
    const sz = e.z + e.az * s2 + e.oz * 0.35;
    g.stalls.push({ x: sx, z: sz, rot, s: 1, v: Math.floor(rng() * 4) });
    g.circles.push({ x: sx, z: sz, r: 1.0 });
  }

  placeExtra(g, b, e, rot, rng);
  placeParked(g, b, e, rot, rng);

  if ((b.kind === "tech" || b.kind === "cbd") && e.road.arterial && chance(rng, 0.3)) {
    const pos = e.len * between(rng, 0.25, 0.75);
    const x = e.x + e.ax * pos + e.ox * 0.2;
    const z = e.z + e.az * pos + e.oz * 0.2;
    g.billboards.push({ x, y: 9.5, z, rot, w: 14, h: 3.5, cell: Math.floor(rng() * 8) });
    g.circles.push({ x, z, r: 0.5 });
  }
}

function placeExtra(g: GenBuffers, b: Block, e: Edge, rot: number, rng: Rng): void {
  const s2 = e.len * between(rng, 0.12, 0.88);
  const id = g.cfg.id;
  let kind: number | null = null;
  if ((b.kind === "market" || b.kind === "old") && chance(rng, id === "hyderabad" ? 0.38 : 0.28)) {
    kind = chance(rng, 0.55) ? 0 : chance(rng, 0.5) ? 1 : 4;
  } else if ((b.kind === "old" || b.kind === "market") && chance(rng, b.kind === "old" ? (id === "hyderabad" ? 0.35 : 0.22) : 0.06)) {
    kind = 2;
  } else if ((b.kind === "tech" || b.kind === "cbd") && e.road.arterial && chance(rng, id === "gurugram" ? 0.14 : id === "hyderabad" ? 0.08 : 0.04)) {
    kind = 3;
  } else if (e.road.arterial && chance(rng, id === "bengaluru" ? 0.08 : 0.05)) {
    kind = 5;
  } else if (b.kind === "park" && chance(rng, id === "pune" ? 0.22 : 0.1)) {
    kind = 1;
  } else if (e.road.arterial && chance(rng, id === "bengaluru" || id === "gurugram" ? 0.16 : 0.1)) {
    // Speed breakers stay on the carriageway
    kind = 7;
  } else if (
    e.road.arterial &&
    (b.kind === "tech" || b.kind === "market" || b.kind === "cbd") &&
    chance(rng, id === "gurugram" || id === "hyderabad" ? 0.14 : 0.09)
  ) {
    kind = 8;
  }
  // Traffic signals (kind 6) are placed at junctions in placeJunctionSignals — not mid-block
  if (kind === null) return;
  // into > 0 moves toward the road; keep roadside props on the sidewalk except breakers
  const into =
    kind === 7
      ? 1.3 + Math.abs(e.road.lanes[0] ?? e.road.half * 0.45)
      : kind === 8 || kind === 5
        ? 0.3
        : 0.4;
  const sx = e.x + e.ax * s2 + e.ox * into;
  const sz = e.z + e.az * s2 + e.oz * into;
  g.extras.push({ x: sx, z: sz, rot, s: kind === 3 ? between(rng, 0.85, 1.15) : 1, v: kind });
  if (kind === 3) g.boxes.push({ minX: sx - 1.2, maxX: sx + 1.2, minZ: sz - 1.2, maxZ: sz + 1.2, h: 28 });
  else if (kind === 7) {
    /* speed breaker — visual only, no collider */
  } else if (kind === 8) g.circles.push({ x: sx, z: sz, r: 1.2 });
  else g.circles.push({ x: sx, z: sz, r: kind === 5 ? 1.4 : 0.85 });
}

function placeParked(g: GenBuffers, b: Block, e: Edge, rot: number, rng: Rng): void {
  // Fringe / village edge — sparse parked (bullock-cart vibe, not Silk Board)
  if (b.fringe && !chance(rng, 0.22)) return;
  // Freeroam: curb vehicles on most blocks so F-enter targets are obvious.
  if (!(chance(rng, b.kind === "resi" ? 0.35 : 0.72))) return;
  // 0 bike, 1 auto, 2 cab — district-weighted freeroam discovery
  let kind: 0 | 1 | 2 = 0;
  const roll = rng();
  if (b.kind === "tech" || b.kind === "park") {
    if (roll < 0.35) kind = 2;
    else if (roll < 0.6) kind = 1;
  } else if (roll < 0.18) kind = 2;
  else if (roll < 0.42) kind = 1;
  const gap = kind === 0 ? 0.95 : kind === 1 ? 2.6 : 4.4;
  const count = kind === 0 ? 3 + Math.floor(rng() * 4) : kind === 1 ? 2 : 1 + Math.floor(rng() * 2);
  const start = e.len * between(rng, 0.1, 0.55);
  for (let k = 0; k < count; k += 1) {
    const pos = start + k * gap;
    if (pos > e.len * 0.92) break;
    // Parked on the sidewalk curb — not in travel lanes
    const x = e.x + e.ax * pos + e.ox * 0.35;
    const z = e.z + e.az * pos + e.oz * 0.35;
    g.parked.push({
      x,
      z,
      rot: rot + Math.PI / 2 + (kind === 0 ? between(rng, -0.1, 0.1) : 0),
      s: 1,
      v: Math.floor(rng() * 8),
      kind,
    });
    g.circles.push({ x, z, r: kind === 0 ? 0.4 : kind === 1 ? 0.9 : 1.1 });
  }
}
