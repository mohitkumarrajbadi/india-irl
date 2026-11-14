/** Vehicle vs pedestrian — brush / thrown / run-over (GTA-style). */
import type { Obb } from "../lib/obb.ts";
import { pointInObb } from "../lib/obb.ts";
import type { Rng } from "../lib/rng.ts";
import {
  classifyPedHit,
  pedHitSeverity,
  pedThrowSpeed,
  pedThrowUp,
  type PedHitKind,
} from "../game/impact.ts";
import type { Ped } from "./pedestrians.ts";

export type PedCrushResult = { severity: number; kind: PedHitKind };

/**
 * Smash peds inside the vehicle OBB. Mutates ped moods / velocities.
 * `vehicleMass` picks throw vs run-over (bike throws; cab/truck run over more).
 */
export function crushPedsInObb(
  peds: Ped[],
  rng: Rng,
  box: Obb,
  speed: number,
  now: number,
  vehicleMass = 1200,
): PedCrushResult {
  const v = Math.abs(speed);
  let best = 0;
  let bestKind: PedHitKind = "brush";
  const px = box.x;
  const pz = box.z;
  // Bumper forward for throw direction (vehicle forward + outward)
  const fx = Math.sin(box.yaw);
  const fz = Math.cos(box.yaw);

  for (const p of peds) {
    if (p.mood === "down" || p.mood === "thrown" || p.mood === "runover") {
      if (now < p.downUntil) continue;
    }
    if (!pointInObb(p.x, p.z, box)) continue;

    const d2 = (p.x - px) ** 2 + (p.z - pz) ** 2;
    const d = Math.sqrt(d2) || 0.01;
    let nx = (p.x - px) / d;
    let nz = (p.z - pz) / d;
    // Bias throw along drive direction so they fly off the nose
    nx = nx * 0.45 + fx * Math.sign(speed || 1) * 0.55;
    nz = nz * 0.45 + fz * Math.sign(speed || 1) * 0.55;
    const inv = 1 / (Math.hypot(nx, nz) || 1);
    nx *= inv;
    nz *= inv;

    const kind = classifyPedHit(v, vehicleMass);
    const sev = pedHitSeverity(kind, v);
    if (sev > best) {
      best = sev;
      bestKind = kind;
    }

    if (kind === "brush") {
      p.mood = "flee";
      p.moodUntil = now + 2800;
      p.x += nx * (1.2 + v * 0.15);
      p.z += nz * (1.2 + v * 0.15);
      p.yaw = Math.atan2(nx, nz);
    } else if (kind === "thrown") {
      const spd = pedThrowSpeed(v, vehicleMass);
      p.mood = "thrown";
      p.vx = nx * spd;
      p.vz = nz * spd;
      p.vy = pedThrowUp(v);
      p.y = 0.4;
      p.yaw = Math.atan2(nx, nz);
      p.downUntil = now + 4200;
      p.moodUntil = p.downUntil;
      p.speed = 0;
    } else {
      // Run over — slide under / along, then stay flat
      p.mood = "runover";
      p.vx = fx * Math.sign(speed || 1) * (2 + v * 0.25);
      p.vz = fz * Math.sign(speed || 1) * (2 + v * 0.25);
      p.vy = 0;
      p.y = 0.12;
      p.downUntil = now + 1600 + Math.min(2000, v * 60);
      p.moodUntil = now + 5000;
      p.speed = 0;
      p.yaw = box.yaw + Math.PI / 2;
    }

    for (const o of peds) {
      if (o === p || o.mood !== "walk") continue;
      if ((o.x - px) ** 2 + (o.z - pz) ** 2 > 64) continue;
      o.mood = "flee";
      o.moodUntil = now + 2000 + rng() * 1200;
    }
  }
  return { severity: best, kind: bestKind };
}
