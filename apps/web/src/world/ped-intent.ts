/** Pick sidewalk intents: patrol, loiter at stalls/stops, cross, chat. */
import { between, type Rng } from "../lib/rng.ts";
import type { CityData } from "./types.ts";
import type { Ped } from "./pedestrians.ts";

export type PedIntent = "patrol" | "loiter" | "cross" | "chat";

export type LoiterSpot = { x: number; z: number };

/** Build loiter anchors from stalls + bus stops. */
export function collectLoiterSpots(city: CityData): LoiterSpot[] {
  const out: LoiterSpot[] = [];
  for (const s of city.stalls) out.push({ x: s.x, z: s.z });
  for (const b of city.busStops) out.push({ x: b.x, z: b.z });
  return out;
}

/** After finishing an edge, maybe switch intent. Night → more loiter. */
export function rollPedIntent(
  p: Ped,
  rng: Rng,
  now: number,
  night: number,
  spots: readonly LoiterSpot[],
  peds: readonly Ped[],
  selfIndex: number,
): void {
  p.intent = "patrol";
  p.chatWith = -1;
  const roll = rng();
  const loiterChance = 0.12 + night * 0.18;
  const crossChance = 0.1 + (1 - night) * 0.08;
  const chatChance = 0.08;

  if (roll < loiterChance && spots.length > 0) {
    let best = spots[0]!;
    let bestD = Infinity;
    for (let i = 0; i < 6; i += 1) {
      const s = spots[Math.floor(rng() * spots.length)]!;
      const d = (s.x - p.x) ** 2 + (s.z - p.z) ** 2;
      if (d < bestD && d < 55 * 55) {
        bestD = d;
        best = s;
      }
    }
    if (bestD < 55 * 55) {
      p.intent = "loiter";
      p.tx = best.x + between(rng, -1.2, 1.2);
      p.tz = best.z + between(rng, -1.2, 1.2);
      p.intentUntil = now + 4000 + rng() * 7000;
      return;
    }
  }

  if (roll < loiterChance + crossChance) {
    // Step across the carriageway along sidewalk outward normal
    const ex = p.bx - p.ax;
    const ez = p.bz - p.az;
    const len = Math.hypot(ex, ez) || 1;
    const ox = -ez / len;
    const oz = ex / len;
    // Pick the side farther from block interior (away from edge midpoint toward road)
    const midX = (p.ax + p.bx) * 0.5;
    const midZ = (p.az + p.bz) * 0.5;
    const side = (p.x - midX) * ox + (p.z - midZ) * oz >= 0 ? 1 : -1;
    const span = 9 + rng() * 5;
    p.intent = "cross";
    p.tx = p.x + ox * side * span;
    p.tz = p.z + oz * side * span;
    p.intentUntil = now + 6000;
    p.speed = between(rng, 1.4, 2.1);
    return;
  }

  if (roll < loiterChance + crossChance + chatChance) {
    for (let i = 0; i < peds.length; i += 1) {
      if (i === selfIndex) continue;
      const o = peds[i]!;
      if (o.mood !== "walk" || o.intent !== "patrol") continue;
      const d2 = (o.x - p.x) ** 2 + (o.z - p.z) ** 2;
      if (d2 > 16 || d2 < 0.5) continue;
      p.intent = "chat";
      o.intent = "chat";
      p.chatWith = i;
      o.chatWith = selfIndex;
      p.intentUntil = now + 3500 + rng() * 4000;
      o.intentUntil = p.intentUntil;
      p.tx = o.x;
      p.tz = o.z;
      o.tx = p.x;
      o.tz = p.z;
      return;
    }
  }
}
