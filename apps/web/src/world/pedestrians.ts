import { between, mulberry32, type Rng } from "../lib/rng.ts";
import type { Obb } from "../lib/obb.ts";
import { crushPedsInObb, type PedCrushResult } from "./ped-crush.ts";
import { cityPedMult, collectPedEdges, pickDenseEdge, type PedEdge } from "./ped-edges.ts";
import { collectLoiterSpots, rollPedIntent, type LoiterSpot, type PedIntent } from "./ped-intent.ts";
import { reactPedsToHorn, scareNearDriver } from "./ped-scare.ts";
import { ambientLodAt } from "./ambient-lod.ts";
import { pickEdgeNearAnchors } from "./ped-edge-bias.ts";
import { pedSpawnOffset } from "./ped-spawn.ts";
import { setPedCrossCtx, tickPed } from "./ped-tick.ts";
import { isRuralAt } from "./terrain-sample.ts";
import type { CityData } from "./types.ts";

export type PedMood = "walk" | "flee" | "fight" | "thrown" | "runover" | "down";
export type { PedIntent };

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
  vx: number;
  vz: number;
  vy: number;
  intent: PedIntent;
  intentUntil: number;
  tx: number;
  tz: number;
  chatWith: number;
};

export class PedestrianSim {
  readonly peds: Ped[] = [];
  private readonly city: CityData;
  private readonly edges: PedEdge[];
  private readonly spots: LoiterSpot[];
  private readonly rng: Rng;
  private scareAcc = 0;
  private readonly meetPts: { x: number; z: number }[];
  private readonly villagePts: { x: number; z: number }[];

  constructor(city: CityData, count: number) {
    this.city = city;
    this.rng = mulberry32(city.config.seed ^ 0x51dea170);
    this.edges = collectPedEdges(city);
    this.spots = collectLoiterSpots(city);
    this.meetPts = city.meets.map((m) => ({ x: m.x, z: m.z }));
    this.villagePts = city.villages.map((v) => ({ x: v.x, z: v.z }));
    // Meet plazas get denser foot traffic (social freeroam).
    const plazaBoost = 1 + Math.min(0.35, this.meetPts.length * 0.08);
    const n = Math.max(8, Math.floor(count * cityPedMult(city.config.id) * plazaBoost));
    for (let i = 0; i < n; i += 1) this.peds.push(this.spawn(true));
  }

  private spawn(anywhere: boolean): Ped {
    const edge = this.pickEdge();
    const t = anywhere ? this.rng() : 0;
    const dir = this.rng() < 0.5 ? 1 : -1;
    const x = edge.ax + (edge.bx - edge.ax) * t;
    const z = edge.az + (edge.bz - edge.az) * t;
    const yaw =
      Math.atan2(edge.bx - edge.ax, edge.bz - edge.az) * (dir > 0 ? 1 : -1) +
      (dir < 0 ? Math.PI : 0);
    return {
      x, z, y: 0, yaw,
      speed: between(this.rng, 0.9, 1.55),
      phase: this.rng() * Math.PI * 2,
      skin: Math.floor(this.rng() * 8),
      top: Math.floor(this.rng() * 10),
      bottom: Math.floor(this.rng() * 6),
      ax: edge.ax, az: edge.az, bx: edge.bx, bz: edge.bz, t, dir,
      courage: this.rng(),
      mood: "walk", moodUntil: 0, fightCd: 0, downUntil: 0,
      vx: 0, vz: 0, vy: 0,
      intent: "patrol", intentUntil: 0, tx: x, tz: z, chatWith: -1,
    };
  }

  /** Bias sidewalks toward meet plazas + village settlements. */
  private pickEdge(): PedEdge {
    const meet = pickEdgeNearAnchors(this.rng, this.edges, this.meetPts, 0.42, 55);
    if (meet) return meet;
    const village = pickEdgeNearAnchors(this.rng, this.edges, this.villagePts, 0.28, 70);
    if (village) return village;
    return pickDenseEdge(this.rng, this.edges);
  }

  private retarget(p: Ped, selfIndex: number, night: number): void {
    const e = this.pickEdge();
    p.ax = e.ax;
    p.az = e.az;
    p.bx = e.bx;
    p.bz = e.bz;
    p.t = this.rng() < 0.5 ? 0 : 1;
    p.dir = p.t < 0.5 ? 1 : -1;
    p.speed = between(this.rng, 0.9, 1.55);
    rollPedIntent(p, this.rng, performance.now(), night, this.spots, this.peds, selfIndex);
  }

  reactToHit(target: Ped, px: number, pz: number, now: number): "fight" | "flee" | "miss" {
    const choice: "fight" | "flee" =
      target.courage > 0.52 && this.rng() < 0.55 + target.courage * 0.35 ? "fight" : "flee";
    target.mood = choice;
    target.moodUntil = now + (choice === "fight" ? 2200 : 3500);
    target.fightCd = now + 600;
    target.intent = "patrol";
    target.chatWith = -1;
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
      p.intent = "patrol";
      p.chatWith = -1;
    }
    return choice;
  }

  reactToHorn(x: number, z: number, now: number): void {
    reactPedsToHorn(this.peds, x, z, now, this.rng);
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

  update(
    dt: number,
    px: number,
    pz: number,
    now = performance.now(),
    night = 0,
    driver?: { yaw: number; speed: number; vehicle: number },
  ): void {
    const lod = ambientLodAt(this.city, px, pz);
    const bubble2 = lod.pedBubble * lod.pedBubble;
    const mid2 = lod.pedMid * lod.pedMid;
    const clearR = Math.max(40, lod.pedBubble * 0.75);
    const rural = isRuralAt(this.city, px, pz);
    setPedCrossCtx({
      xs: this.city.xs,
      zs: this.city.zs,
      timeSec: now * 0.001,
    });
    this.scareAcc += dt;
    if (this.scareAcc > 0.2 && driver && !rural) {
      this.scareAcc = 0;
      scareNearDriver(this.peds, px, pz, driver.yaw, driver.speed, driver.vehicle, now);
    }
    const frame = (now / 16) | 0;
    for (let i = 0; i < this.peds.length; i += 1) {
      const p = this.peds[i]!;
      const dxp = p.x - px;
      const dzp = p.z - pz;
      const d2 = dxp * dxp + dzp * dzp;
      // Village / hill: pull crowd back into the city — no sidewalk swarm on the ghats
      if (rural && d2 < clearR * clearR) {
        Object.assign(p, this.spawn(true));
        continue;
      }
      if (d2 > bubble2) {
        Object.assign(p, this.spawn(true));
        if (!rural) {
          const yaw = driver?.yaw ?? 0;
          const off = pedSpawnOffset(this.rng, px, pz, yaw, lod.pedBubble, lod.pedMid);
          p.x = off.x;
          p.z = off.z;
        }
        continue;
      }
      // Sparse regions: alternate-frame ticks beyond mid-range
      if (lod.density < 0.85 && d2 > mid2 && (i & 1) !== (frame & 1)) continue;
      tickPed(p, dt, px, pz, now, this.rng, (ped) => this.retarget(ped, i, night), night);
    }
  }
}
