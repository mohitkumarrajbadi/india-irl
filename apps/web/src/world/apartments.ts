/**
 * Player apartments — doors on residential blocks (deterministic, pure data).
 * Interiors are a local room volume; invites sync via `ap` wire.
 */
import type { CityData } from "./types.ts";

export type Apartment = {
  id: string;
  label: string;
  x: number;
  z: number;
  yaw: number;
  /** Half-extent of interior footprint (m). */
  half: number;
};

const DOOR_REACH = 3.4;
export const APARTMENT_REACH2 = DOOR_REACH * DOOR_REACH;

/** One pad per resi district cluster — home near sidewalk, not mid-block. */
export function apartmentsFromCity(city: CityData): Apartment[] {
  const out: Apartment[] = [];
  const seen = new Set<string>();
  for (const b of city.blocks) {
    if (b.kind !== "resi" || b.fringe) continue;
    const key = `${Math.floor(b.bi / 2)},${Math.floor(b.bj / 2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cx = (b.minX + b.maxX) * 0.5;
    const cz = b.minZ + 2.2;
    const id = `apt-${b.bi}-${b.bj}`;
    const district = city.config.districts[b.district]?.name ?? "Residences";
    out.push({
      id,
      label: `${district} · Flat ${out.length + 1}`,
      x: cx,
      z: cz,
      yaw: Math.PI / 2,
      half: 4.2,
    });
    if (out.length >= 6) break;
  }
  // Guarantee at least one near spawn
  if (out.length === 0) {
    out.push({
      id: "apt-home",
      label: "Your flat",
      x: city.spawn.x - 8,
      z: city.spawn.z + 4,
      yaw: city.spawn.yaw,
      half: 4.2,
    });
  }
  return out;
}

export function nearestApartment(
  x: number,
  z: number,
  apts: readonly Apartment[],
  radius2 = APARTMENT_REACH2,
): Apartment | null {
  let best: Apartment | null = null;
  let bd = radius2;
  for (const a of apts) {
    const d = (a.x - x) ** 2 + (a.z - z) ** 2;
    if (d <= bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}
