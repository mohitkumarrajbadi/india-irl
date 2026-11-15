/** Horn / approaching-vehicle reactions for sidewalk crowd. */
import type { Rng } from "../lib/rng.ts";
import type { Ped } from "./pedestrians.ts";

/** Scare nearby walkers when the player honks. */
export function reactPedsToHorn(
  peds: Ped[],
  x: number,
  z: number,
  now: number,
  rng: Rng,
  radius = 22,
): void {
  const r2 = radius * radius;
  for (const p of peds) {
    if (p.mood !== "walk") continue;
    const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d2 > r2) continue;
    if (rng() > 0.72) continue;
    p.mood = "flee";
    p.moodUntil = now + 1800 + rng() * 1600;
    p.intent = "patrol";
    p.chatWith = -1;
  }
}

/** Player-driven scare: ped relative to vehicle pose. */
export function scareNearDriver(
  peds: Ped[],
  px: number,
  pz: number,
  yaw: number,
  speed: number,
  vehicle: number,
  now: number,
): void {
  if (vehicle <= 0 || Math.abs(speed) < 6) return;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const look = 4 + Math.abs(speed) * 0.55;
  for (const p of peds) {
    if (p.mood !== "walk") continue;
    const rx = p.x - px;
    const rz = p.z - pz;
    const along = rx * sin + rz * cos;
    if (along < 0.5 || along > look) continue;
    const lat = rx * cos - rz * sin;
    if (Math.abs(lat) > 2.8) continue;
    p.mood = "flee";
    p.moodUntil = now + 2000 + Math.min(2000, Math.abs(speed) * 70);
    p.intent = "patrol";
    p.chatWith = -1;
  }
}
