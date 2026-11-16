/** Per-frame sidewalk AI: walk / intent / flee / fight / thrown / runover / down. */
import { clamp } from "../lib/math.ts";
import { between, type Rng } from "../lib/rng.ts";
import { pedCrossShouldWait } from "./ped-cross.ts";
import type { PedIntent } from "./ped-intent.ts";
import type { Ped } from "./pedestrians.ts";

export type PedRetarget = (p: Ped) => void;

export type PedCrossCtx = {
  xs: readonly number[];
  zs: readonly number[];
  timeSec: number;
};

let crossCtx: PedCrossCtx | null = null;

/** Set once per PedestrianSim.update so cross intents can read signals. */
export function setPedCrossCtx(ctx: PedCrossCtx | null): void {
  crossCtx = ctx;
}

const GRAV = 18;

export function tickPed(
  p: Ped,
  dt: number,
  px: number,
  pz: number,
  now: number,
  rng: Rng,
  retarget: PedRetarget,
  night = 0,
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
    p.speed = between(rng, 0.9, 1.55) * (1 - night * 0.25);
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

  if (tickIntent(p, dt, now, rng, retarget)) return;

  const ex = p.bx - p.ax;
  const ez = p.bz - p.az;
  const len = Math.hypot(ex, ez) || 1;
  const walkSpd = p.speed * (1 - night * 0.28);
  p.t += (p.dir * walkSpd * dt) / len;
  if (p.t > 1 || p.t < 0) retarget(p);
  p.x = p.ax + ex * clamp(p.t, 0, 1);
  p.z = p.az + ez * clamp(p.t, 0, 1);
  const wantYaw = Math.atan2(ex * p.dir, ez * p.dir);
  let dy = wantYaw - p.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  p.yaw += clamp(dy, -3 * dt, 3 * dt);
  p.phase += walkSpd * dt * 6;

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

function tickIntent(
  p: Ped,
  dt: number,
  now: number,
  rng: Rng,
  retarget: PedRetarget,
): boolean {
  const intent: PedIntent = p.intent;
  if (intent === "patrol") return false;

  if (now > p.intentUntil && intent !== "cross") {
    p.intent = "patrol";
    p.chatWith = -1;
    if (intent === "loiter" || intent === "chat") retarget(p);
    return false;
  }

  if (intent === "loiter") {
    const dx = p.tx - p.x;
    const dz = p.tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.6) {
      const spd = Math.min(p.speed, 1.2);
      p.x += (dx / dist) * spd * dt;
      p.z += (dz / dist) * spd * dt;
      p.yaw = Math.atan2(dx, dz);
      p.phase += spd * dt * 5;
    } else {
      p.phase += dt * 0.8;
      p.yaw += Math.sin(now * 0.001 + p.phase) * 0.4 * dt;
    }
    return true;
  }

  if (intent === "cross") {
    const dx = p.tx - p.x;
    const dz = p.tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.7 || now > p.intentUntil) {
      p.intent = "patrol";
      retarget(p);
      return false;
    }
    // Hold at curb while conflicting traffic has green/amber.
    if (
      crossCtx &&
      pedCrossShouldWait(p.x, p.z, p.tx, p.tz, crossCtx.xs, crossCtx.zs, crossCtx.timeSec)
    ) {
      p.yaw = Math.atan2(dx, dz);
      p.phase += dt * 1.1;
      return true;
    }
    const spd = p.speed * 1.15;
    p.x += (dx / dist) * spd * dt;
    p.z += (dz / dist) * spd * dt;
    p.yaw = Math.atan2(dx, dz);
    p.phase += spd * dt * 7;
    return true;
  }

  if (intent === "chat") {
    const dx = p.tx - p.x;
    const dz = p.tz - p.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist > 1.4) {
      p.x += (dx / dist) * 0.9 * dt;
      p.z += (dz / dist) * 0.9 * dt;
    }
    p.yaw = Math.atan2(dx, dz);
    p.phase += dt * 1.2;
    return true;
  }

  return false;
}
