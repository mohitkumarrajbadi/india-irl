import { clamp } from "../lib/math.ts";
import { between, mulberry32, pick, type Rng } from "../lib/rng.ts";
import { crashLog } from "../game/crash.ts";
import type { CityData } from "./types.ts";

export type Cop = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
  state: "patrol" | "respond" | "ticket";
  tx: number;
  tz: number;
  /** performance.now() deadline for ticket linger / patrol retarget. */
  until: number;
  /** Crash event timestamp this cop is answering, or 0. */
  crashAt: number;
};

const CITY_COPS: Record<string, number> = {
  bengaluru: 5,
  pune: 4,
  hyderabad: 5,
  gurugram: 6,
};

/**
 * Local traffic-police sim. When a crash is reported, the nearest free
 * constable rides over, hangs at the site, then resumes patrol.
 */
export class PoliceSim {
  readonly cops: Cop[] = [];
  private readonly rng: Rng;
  private readonly spots: { x: number; z: number }[] = [];
  private handled = new Set<number>();

  constructor(city: CityData) {
    this.rng = mulberry32(city.config.seed ^ 0xc0ffee11);
    const n = CITY_COPS[city.config.id] ?? 4;
    // Prefer arterial signal / auto-stand corners as patrol posts.
    for (const e of city.extras) {
      if (e.v === 6 || e.v === 8) this.spots.push({ x: e.x, z: e.z });
    }
    for (const m of city.meets) {
      this.spots.push({ x: m.x, z: m.z });
    }
    if (this.spots.length === 0) {
      this.spots.push({ x: city.spawn.x, z: city.spawn.z });
    }
    for (let i = 0; i < n; i += 1) {
      const s = this.spots[i % this.spots.length];
      const jitter = between(this.rng, -6, 6);
      this.cops.push({
        x: s.x + jitter,
        z: s.z + between(this.rng, -6, 6),
        yaw: this.rng() * Math.PI * 2,
        speed: between(this.rng, 2.4, 3.6),
        phase: this.rng() * Math.PI * 2,
        state: "patrol",
        tx: s.x,
        tz: s.z,
        until: 0,
        crashAt: 0,
      });
    }
  }

  private retargetPatrol(c: Cop): void {
    const s = pick(this.rng, this.spots);
    c.tx = s.x + between(this.rng, -8, 8);
    c.tz = s.z + between(this.rng, -8, 8);
    c.speed = between(this.rng, 2.2, 3.8);
    c.state = "patrol";
    c.crashAt = 0;
  }

  /** Dispatch free cops to recent severe crashes. */
  private dispatch(now: number): void {
    for (const ev of crashLog) {
      if (ev.severity < 0.28) continue;
      if (now - ev.at > 28_000) continue;
      if (this.handled.has(ev.at)) continue;
      let best: Cop | null = null;
      let bestD = Infinity;
      for (const c of this.cops) {
        if (c.state !== "patrol") continue;
        const d = Math.hypot(c.x - ev.x, c.z - ev.z);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (!best || bestD > 220) continue;
      this.handled.add(ev.at);
      best.state = "respond";
      best.tx = ev.x;
      best.tz = ev.z;
      best.speed = between(this.rng, 5.5, 7.2);
      best.crashAt = ev.at;
      best.until = now + 18_000;
    }
    // Cap handled set.
    if (this.handled.size > 24) {
      const keep = [...this.handled].slice(-12);
      this.handled = new Set(keep);
    }
  }

  /**
   * @returns true once when a cop just arrives at a crash (for toast).
   */
  update(dt: number, now: number): boolean {
    this.dispatch(now);
    let arrived = false;
    for (const c of this.cops) {
      if (c.state === "ticket") {
        c.phase += dt * 4;
        if (now > c.until) this.retargetPatrol(c);
        continue;
      }

      const dx = c.tx - c.x;
      const dz = c.tz - c.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.4) {
        if (c.state === "respond") {
          c.state = "ticket";
          c.until = now + 7_000 + this.rng() * 4_000;
          c.speed = 0;
          arrived = true;
        } else {
          this.retargetPatrol(c);
        }
        continue;
      }

      const inv = 1 / dist;
      const step = Math.min(dist, c.speed * dt);
      c.x += dx * inv * step;
      c.z += dz * inv * step;
      const want = Math.atan2(dx, dz);
      let dy = want - c.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      c.yaw += clamp(dy, -4.5 * dt, 4.5 * dt);
      c.phase += c.speed * dt * 5.5;

      if (c.state === "respond" && now > c.until) {
        // Gave up / scene cleared.
        this.retargetPatrol(c);
      }
    }
    return arrived;
  }
}
