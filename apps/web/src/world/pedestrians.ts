import { between, mulberry32, pick, type Rng } from "../lib/rng.ts";
import type { Obb } from "../lib/obb.ts";
import { crushPedsInObb, type PedCrushResult } from "./ped-crush.ts";
import { cityPedMult, collectPedEdges, pickDenseEdge, type PedEdge } from "./ped-edges.ts";
import { tickPed } from "./ped-tick.ts";
import type { CityData } from "./types.ts";

export type PedMood = "walk" | "flee" | "fight" | "thrown" | "runover" | "down";

export type Ped = {
  x: number;
  z: number;
  y: number;
  yaw: number;
  speed: number;
  phase: number;
  skin: number;
  top: number;
  bottom: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  t: number;
  dir: number;
  courage: number;
  mood: PedMood;
  moodUntil: number;
  fightCd: number;
  downUntil: number;
  /** Ballistic / slide while thrown or run over. */
  vx: number;
  vz: number;
  vy: number;
};

export class PedestrianSim {
  readonly peds: Ped[] = [];
  private readonly edges: PedEdge[];
  private readonly rng: Rng;

  constructor(city: CityData, count: number) {
    this.rng = mulberry32(city.config.seed ^ 0x51dea170);
    this.edges = collectPedEdges(city);
    const n = Math.max(8, Math.floor(count * cityPedMult(city.config.id)));
    for (let i = 0; i < n; i += 1) this.peds.push(this.spawn(true));
  }

  private spawn(anywhere: boolean): Ped {
    const edge = pickDenseEdge(this.rng, this.edges);
    const t = anywhere ? this.rng() : 0;
    const dir = this.rng() < 0.5 ? 1 : -1;
    const x = edge.ax + (edge.bx - edge.ax) * t;
    const z = edge.az + (edge.bz - edge.az) * t;
    const yaw =
      Math.atan2(edge.bx - edge.ax, edge.bz - edge.az) * (dir > 0 ? 1 : -1) +
      (dir < 0 ? Math.PI : 0);
    return {
      x,
      z,
      y: 0,
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
      downUntil: 0,
      vx: 0,
      vz: 0,
      vy: 0,
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

  reactToHit(target: Ped, px: number, pz: number, now: number): "fight" | "flee" | "miss" {
    const choice: "fight" | "flee" =
      target.courage > 0.52 && this.rng() < 0.55 + target.courage * 0.35 ? "fight" : "flee";
    target.mood = choice;
    target.moodUntil = now + (choice === "fight" ? 2200 : 3500);
    target.fightCd = now + 600;
    for (const p of this.peds) {
      if (p === target || p.mood !== "walk") continue;
      if ((p.x - px) ** 2 + (p.z - pz) ** 2 > 81) continue;
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

  hitByVehicle(box: Obb, speed: number, now: number, vehicleMass = 1200): PedCrushResult {
    return crushPedsInObb(this.peds, this.rng, box, speed, now, vehicleMass);
  }

  tryCounter(px: number, pz: number, now: number): boolean {
    for (const p of this.peds) {
      if (p.mood !== "fight" || now < p.fightCd) continue;
      if ((p.x - px) ** 2 + (p.z - pz) ** 2 > 2.1 * 2.1) continue;
      p.fightCd = now + 900;
      p.yaw = Math.atan2(px - p.x, pz - p.z);
      return true;
    }
    return false;
  }

  update(dt: number, px: number, pz: number, now = performance.now()): void {
    const bubble2 = 220 * 220;
    const retarget = (p: Ped) => this.retarget(p);
    for (const p of this.peds) {
      const dxp = p.x - px;
      const dzp = p.z - pz;
      if (dxp * dxp + dzp * dzp > bubble2) {
        Object.assign(p, this.spawn(true));
        const ang = this.rng() * Math.PI * 2;
        const r = 40 + this.rng() * 90;
        p.x = px + Math.cos(ang) * r;
        p.z = pz + Math.sin(ang) * r;
        continue;
      }
      tickPed(p, dt, px, pz, now, this.rng, retarget);
    }
  }
}
