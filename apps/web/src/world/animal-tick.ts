/** Per-frame animal FSM: roam / idle / graze / flee / chase (dogs). */
import { clamp, wrapAngle } from "../lib/math.ts";
import { between, type Rng } from "../lib/rng.ts";
import { ANIMAL_INFO, type Animal } from "./animal-kinds.ts";

export function tickAnimal(
  a: Animal,
  dt: number,
  px: number,
  pz: number,
  now: number,
  rng: Rng,
  vehSpeed: number,
): void {
  const info = ANIMAL_INFO[a.kind];
  const d2Player = (a.x - px) ** 2 + (a.z - pz) ** 2;

  // Approaching vehicle → flee (cows slower to react)
  if (a.mood !== "flee" && Math.abs(vehSpeed) > (a.kind === 0 ? 7 : 5)) {
    const sense = a.kind === 0 ? 16 : a.kind === 1 ? 22 : 18;
    if (d2Player < sense * sense) {
      a.mood = "flee";
      a.moodUntil = now + 2200 + rng() * 1800;
    }
  }

  // Dogs casually approach slow foot traffic, then flee if startled.
  if (
    a.kind === 1 &&
    a.mood !== "flee" &&
    a.mood !== "chase" &&
    Math.abs(vehSpeed) < 2.2 &&
    d2Player < 12 * 12 &&
    d2Player > 2.2 * 2.2 &&
    rng() < 0.012
  ) {
    a.mood = "chase";
    a.moodUntil = now + 2800 + rng() * 2200;
  }

  if (a.mood === "chase") {
    if (Math.abs(vehSpeed) > 4.5 || now > a.moodUntil) {
      a.mood = Math.abs(vehSpeed) > 4.5 ? "flee" : "idle";
      a.moodUntil = now + (a.mood === "flee" ? 1800 : 1200) + rng() * 1200;
      if (a.mood === "idle") a.speed = 0;
    } else {
      const dx = px - a.x;
      const dz = pz - a.z;
      const d = Math.hypot(dx, dz) || 1;
      const want = Math.min(info.top * 0.85, 2.4);
      a.speed = Math.min(want, a.speed + info.accel * dt);
      a.x += (dx / d) * a.speed * dt;
      a.z += (dz / d) * a.speed * dt;
      a.yaw = Math.atan2(dx, dz);
      a.phase += a.speed * dt * 5;
      if (d < 1.8) {
        a.mood = "idle";
        a.moodUntil = now + 900 + rng() * 800;
        a.speed = 0;
      }
    }
    softLeash(a);
    return;
  }

  if (a.mood === "flee") {
    const dx = a.x - px;
    const dz = a.z - pz;
    const d = Math.hypot(dx, dz) || 1;
    a.speed = Math.min(info.flee, a.speed + info.accel * dt);
    a.x += (dx / d) * a.speed * dt;
    a.z += (dz / d) * a.speed * dt;
    a.yaw = Math.atan2(dx, dz);
    a.phase += a.speed * dt * 5;
    if (now > a.moodUntil) {
      a.mood = "idle";
      a.moodUntil = now + 1500 + rng() * 2000;
      a.speed = 0;
      pickWaypoint(a, rng);
    }
    softLeash(a);
    return;
  }

  if (a.mood === "idle" || a.mood === "graze") {
    a.speed = Math.max(0, a.speed - info.accel * dt);
    a.phase += dt * (a.mood === "graze" ? 1.2 : 0.4);
    a.yaw += Math.sin(a.phase * 0.3) * 0.15 * dt;
    if (now > a.moodUntil) {
      if (a.kind === 0 && rng() < 0.45) {
        a.mood = "graze";
        a.moodUntil = now + 4000 + rng() * 6000;
      } else if (rng() < 0.55) {
        a.mood = "roam";
        pickWaypoint(a, rng);
      } else {
        a.mood = "idle";
        a.moodUntil = now + 2000 + rng() * 4000;
      }
    }
    return;
  }

  // roam
  const dx = a.tx - a.x;
  const dz = a.tz - a.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.8) {
    a.mood = a.kind === 0 && rng() < 0.5 ? "graze" : "idle";
    a.moodUntil = now + 2500 + rng() * 5000;
    a.speed = 0;
    return;
  }
  const want = Math.atan2(dx, dz);
  a.yaw += clamp(wrapAngle(want - a.yaw), -1.8 * dt, 1.8 * dt);
  a.speed = Math.min(info.top, a.speed + info.accel * dt);
  a.x += Math.sin(a.yaw) * a.speed * dt;
  a.z += Math.cos(a.yaw) * a.speed * dt;
  a.phase += a.speed * dt * 4;
  softLeash(a);
}

function pickWaypoint(a: Animal, rng: Rng): void {
  const r = a.leash * (0.25 + rng() * 0.75);
  const ang = rng() * Math.PI * 2;
  a.tx = a.hx + Math.cos(ang) * r;
  a.tz = a.hz + Math.sin(ang) * r;
}

function softLeash(a: Animal): void {
  const dx = a.x - a.hx;
  const dz = a.z - a.hz;
  const d = Math.hypot(dx, dz);
  if (d > a.leash) {
    const pull = (d - a.leash) * 0.35;
    a.x -= (dx / d) * pull;
    a.z -= (dz / d) * pull;
  }
}

export function scareAnimalHorn(a: Animal, x: number, z: number, now: number, rng: Rng): void {
  const d2 = (a.x - x) ** 2 + (a.z - z) ** 2;
  const r = a.kind === 0 ? 18 : 28;
  if (d2 > r * r) return;
  if (a.kind === 0 && rng() > 0.55) return; // cows often ignore
  a.mood = "flee";
  a.moodUntil = now + between(rng, 1600, 3200);
}
