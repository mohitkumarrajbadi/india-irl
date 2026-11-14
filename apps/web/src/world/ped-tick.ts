/** Per-frame sidewalk AI: walk / flee / fight / thrown / runover / down. */
import { clamp } from "../lib/math.ts";
import { between, type Rng } from "../lib/rng.ts";
import type { Ped } from "./pedestrians.ts";

export type PedRetarget = (p: Ped) => void;

const GRAV = 18;

export function tickPed(
  p: Ped,
  dt: number,
  px: number,
  pz: number,
  now: number,
  rng: Rng,
  retarget: PedRetarget,
): void {
  if (p.mood === "thrown") {
    p.vy -= GRAV * dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-0.6 * dt);
    p.vz *= Math.exp(-0.6 * dt);
    p.phase += 14 * dt;
    p.yaw += 4.5 * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.vx *= 0.25;
      p.vz *= 0.25;
      p.mood = "down";
      p.downUntil = now + 3200;
      p.moodUntil = p.downUntil;
    }
    return;
  }

  if (p.mood === "runover") {
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.vx *= Math.exp(-2.2 * dt);
    p.vz *= Math.exp(-2.2 * dt);
    p.y = 0.1;
    p.phase += 8 * dt;
    if (now > p.downUntil || Math.hypot(p.vx, p.vz) < 0.4) {
      p.mood = "down";
      p.vx = 0;
      p.vz = 0;
      p.downUntil = now + 4000;
      p.moodUntil = p.downUntil;
    }
    return;
  }

  if (p.mood === "down") {
    p.y = 0.14;
    if (now > p.downUntil) {
      p.mood = "flee";
      p.moodUntil = now + 2500;
      p.speed = between(rng, 1.2, 1.8);
      p.y = 0;
      p.vx = 0;
      p.vz = 0;
      p.vy = 0;
    } else {
      p.phase += dt * 2;
    }
    return;
  }

  p.y = 0;

  if (p.mood !== "walk" && now > p.moodUntil) {
    p.mood = "walk";
    p.speed = between(rng, 0.9, 1.55);
    retarget(p);
  }

  if (p.mood === "flee") {
    const dx = p.x - px;
    const dz = p.z - pz;
    const d = Math.hypot(dx, dz) || 1;
    const spd = 3.4;
    p.x += (dx / d) * spd * dt;
    p.z += (dz / d) * spd * dt;
    p.yaw = Math.atan2(dx, dz);
    p.phase += spd * dt * 8;
    return;
  }

  if (p.mood === "fight") {
    const dx = px - p.x;
    const dz = pz - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const spd = d > 1.4 ? 2.6 : 0.4;
    p.x += (dx / d) * spd * dt;
    p.z += (dz / d) * spd * dt;
    p.yaw = Math.atan2(dx, dz);
    p.phase += 10 * dt;
    return;
  }

  const ex = p.bx - p.ax;
  const ez = p.bz - p.az;
  const len = Math.hypot(ex, ez) || 1;
  p.t += (p.dir * p.speed * dt) / len;
  if (p.t > 1 || p.t < 0) retarget(p);
  p.x = p.ax + ex * clamp(p.t, 0, 1);
  p.z = p.az + ez * clamp(p.t, 0, 1);
  const wantYaw = Math.atan2(ex * p.dir, ez * p.dir);
  let dy = wantYaw - p.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  p.yaw += clamp(dy, -3 * dt, 3 * dt);
  p.phase += p.speed * dt * 6;

  const ddx = p.x - px;
  const ddz = p.z - pz;
  const d2 = ddx * ddx + ddz * ddz;
  if (d2 < 1.6 * 1.6 && d2 > 1e-4) {
    const d = Math.sqrt(d2);
    const push = (1.6 - d) * 0.55;
    p.x += (ddx / d) * push;
    p.z += (ddz / d) * push;
  }
}
