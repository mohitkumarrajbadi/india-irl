import { clamp } from "../lib/math.ts";
import { between, mulberry32, pick, type Rng } from "../lib/rng.ts";
import type { CityData, DistrictKind } from "./types.ts";

export type PedMood = "walk" | "flee" | "fight";

export type Ped = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
  /** Skin / top / bottom palette indices into shared color tables. */
  skin: number;
  top: number;
  bottom: number;
  /** Current sidewalk segment. */
  ax: number;
  az: number;
  bx: number;
  bz: number;
  t: number;
  /** 1 forward along a→b, -1 reverse. */
  dir: number;
  /** 0 timid … 1 street-tough — some fight back, some don't. */
  courage: number;
  mood: PedMood;
  moodUntil: number;
  fightCd: number;
};

type Edge = { ax: number; az: number; bx: number; bz: number; kind: DistrictKind | "landmark" | "lake" };

const DENSITY: Record<string, number> = {
  market: 1.35,
  old: 1.2,
  tech: 0.7,
  cbd: 0.85,
  resi: 0.55,
  park: 0.9,
  landmark: 0.4,
  lake: 0.35,
};

/** City flavour multipliers. */
const CITY_MULT: Record<string, number> = {
  bengaluru: 1.05,
  pune: 1.0,
  hyderabad: 1.15,
  gurugram: 0.9,
};

function collectEdges(city: CityData): Edge[] {
  const edges: Edge[] = [];
  const inset = 2.4;
  for (const b of city.blocks) {
    if (b.kind === "lake") continue;
    const minX = b.minX + inset;
    const maxX = b.maxX - inset;
    const minZ = b.minZ + inset;
    const maxZ = b.maxZ - inset;
    if (maxX - minX < 8 || maxZ - minZ < 8) continue;
    edges.push(
      { ax: minX, az: minZ, bx: maxX, bz: minZ, kind: b.kind },
      { ax: maxX, az: minZ, bx: maxX, bz: maxZ, kind: b.kind },
      { ax: maxX, az: maxZ, bx: minX, bz: maxZ, kind: b.kind },
      { ax: minX, az: maxZ, bx: minX, bz: minZ, kind: b.kind },
    );
  }
  return edges;
}

export class PedestrianSim {
  readonly peds: Ped[] = [];
  private readonly edges: Edge[];
  private readonly rng: Rng;

  constructor(city: CityData, count: number) {
    this.rng = mulberry32(city.config.seed ^ 0x51dea170);
    this.edges = collectEdges(city);
    const mult = CITY_MULT[city.config.id] ?? 1;
    const n = Math.max(8, Math.floor(count * mult));
    for (let i = 0; i < n; i += 1) this.peds.push(this.spawn(true));
  }

  private spawn(anywhere: boolean): Ped {
    const weighted = this.edges;
    let edge = weighted[0];
    // Prefer denser district kinds.
    for (let tries = 0; tries < 8; tries += 1) {
      const e = pick(this.rng, weighted);
      const dens = DENSITY[e.kind] ?? 0.6;
      if (this.rng() < dens || tries === 7) {
        edge = e;
        break;
      }
    }
    const t = anywhere ? this.rng() : 0;
    const dir = this.rng() < 0.5 ? 1 : -1;
    const x = edge.ax + (edge.bx - edge.ax) * t;
    const z = edge.az + (edge.bz - edge.az) * t;
    const yaw = Math.atan2(edge.bx - edge.ax, edge.bz - edge.az) * (dir > 0 ? 1 : -1) + (dir < 0 ? Math.PI : 0);
    return {
      x,
      z,
      yaw,
      speed: between(this.rng, 0.9, 1.55),
      phase: this.rng() * Math.PI * 2,
      skin: Math.floor(this.rng() * 8),
      top: Math.floor(this.rng() * 10),
      bottom: Math.floor(this.rng() * 6),
      ax: edge.ax,
      az: edge.az,
      bx: edge.bx,
      bz: edge.bz,
      t,
      dir,
      courage: this.rng(),
      mood: "walk",
      moodUntil: 0,
      fightCd: 0,
    };
  }

  private retarget(p: Ped): void {
    const e = pick(this.rng, this.edges);
    p.ax = e.ax;
    p.az = e.az;
    p.bx = e.bx;
    p.bz = e.bz;
    p.t = this.rng() < 0.5 ? 0 : 1;
    p.dir = p.t < 0.5 ? 1 : -1;
    p.speed = between(this.rng, 0.9, 1.55);
  }

  /**
   * Player punched/kicked near this ped. Returns "fight" if they swing back.
   * Nearby crowd also reacts (some flee, some join).
   */
  reactToHit(target: Ped, px: number, pz: number, now: number): "fight" | "flee" | "miss" {
    const choice: "fight" | "flee" = target.courage > 0.52 && this.rng() < 0.55 + target.courage * 0.35 ? "fight" : "flee";
    target.mood = choice;
    target.moodUntil = now + (choice === "fight" ? 2200 : 3500);
    target.fightCd = now + 600;
    // Bystanders within ~9m: mix of flee / occasional fight-back.
    for (const p of this.peds) {
      if (p === target) continue;
      const d2 = (p.x - px) ** 2 + (p.z - pz) ** 2;
      if (d2 > 9 * 9) continue;
      if (p.mood !== "walk") continue;
      if (p.courage > 0.7 && this.rng() < 0.28) {
        p.mood = "fight";
        p.moodUntil = now + 1800;
      } else if (this.rng() < 0.72) {
        p.mood = "flee";
        p.moodUntil = now + 2800 + this.rng() * 1500;
      }
    }
    return choice;
  }

  /** True if a fighting ped lands a counter within range this frame. */
  tryCounter(px: number, pz: number, now: number): boolean {
    for (const p of this.peds) {
      if (p.mood !== "fight") continue;
      if (now < p.fightCd) continue;
      const d2 = (p.x - px) ** 2 + (p.z - pz) ** 2;
      if (d2 > 2.1 * 2.1) continue;
      p.fightCd = now + 900;
      p.yaw = Math.atan2(px - p.x, pz - p.z);
      return true;
    }
    return false;
  }

  update(dt: number, px: number, pz: number, now = performance.now()): void {
    const bubble2 = 220 * 220;
    for (const p of this.peds) {
      const dxp = p.x - px;
      const dzp = p.z - pz;
      if (dxp * dxp + dzp * dzp > bubble2) {
        Object.assign(p, this.spawn(true));
        // Keep them in the player's bubble.
        const ang = this.rng() * Math.PI * 2;
        const r = 40 + this.rng() * 90;
        p.x = px + Math.cos(ang) * r;
        p.z = pz + Math.sin(ang) * r;
        continue;
      }

      if (p.mood !== "walk" && now > p.moodUntil) {
        p.mood = "walk";
        p.speed = between(this.rng, 0.9, 1.55);
        this.retarget(p);
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
        continue;
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
        continue;
      }

      const ex = p.bx - p.ax;
      const ez = p.bz - p.az;
      const len = Math.hypot(ex, ez) || 1;
      p.t += (p.dir * p.speed * dt) / len;
      if (p.t > 1 || p.t < 0) {
        this.retarget(p);
      }
      p.x = p.ax + ex * clamp(p.t, 0, 1);
      p.z = p.az + ez * clamp(p.t, 0, 1);
      const wantYaw = Math.atan2(ex * p.dir, ez * p.dir);
      let dy = wantYaw - p.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      p.yaw += clamp(dy, -3 * dt, 3 * dt);
      p.phase += p.speed * dt * 6;

      // Soft sidestep away from the player.
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
  }
}
