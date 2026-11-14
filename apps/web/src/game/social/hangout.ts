/** Sit / leave hangout anchors + voice distance bias. */
import { anchorsFromCity, nearestAnchor, type HangoutAnchor } from "@/world/anchors";
import type { CityData } from "@/world/types";

/** Chai-break emote doubles as sit pose. */
export const SIT_EMOTE = 4;

let seated: HangoutAnchor | null = null;
let cache: HangoutAnchor[] = [];
let cacheCity: CityData | null = null;

export function hangoutAnchors(city: CityData): HangoutAnchor[] {
  if (cacheCity !== city) {
    cacheCity = city;
    cache = anchorsFromCity(city);
  }
  return cache;
}

export function hangoutSeated(): HangoutAnchor | null {
  return seated;
}

export function hangoutTrySit(
  city: CityData,
  x: number,
  z: number,
): HangoutAnchor | null {
  if (seated) return seated;
  const a = nearestAnchor(x, z, hangoutAnchors(city));
  if (!a) return null;
  seated = a;
  return a;
}

export function hangoutLeave(): void {
  seated = null;
}

/** Effective distance² for voice ranking (priority when both near same meet). */
export function hangoutVoiceDist2(
  selfX: number,
  selfZ: number,
  peerX: number,
  peerZ: number,
  peerSeatedNear: boolean,
): number {
  let d2 = (peerX - selfX) ** 2 + (peerZ - selfZ) ** 2;
  if (seated && peerSeatedNear) d2 *= 0.35 * 0.35;
  return d2;
}

export function hangoutPrompt(city: CityData, x: number, z: number): string | null {
  if (seated) return "E · Stand up";
  const a = nearestAnchor(x, z, hangoutAnchors(city));
  return a ? `E · Sit · ${a.label}` : null;
}
