import { mulberry32, type Rng } from "../lib/rng.ts";
import { ambientLodAt } from "../world/ambient-lod.ts";
import type { CityData } from "../world/types.ts";
import { isTwoWheeler, type Agent, type Obstacle, type TrafficKind } from "./traffic-kinds.ts";
import { placeNearbyAgent } from "./traffic-nearby.ts";
import { respawnAgent, type NavCtx } from "./traffic-nav.ts";
import { stepAgent } from "./traffic-step.ts";
import { trafficShouldTick, trafficTickLod } from "./traffic-tick-lod.ts";

export type { Agent, Obstacle, TrafficKind } from "./traffic-kinds.ts";
export { KIND_INFO } from "./traffic-kinds.ts";

export class TrafficSim {
  readonly agents: Agent[] = [];
  readonly city: CityData;
  private readonly nav: NavCtx;
  private readonly rng: Rng;
  private frame = 0;

  constructor(city: CityData, counts: readonly number[], tints: number[][], seed = city.config.seed) {
    this.city = city;
    this.rng = mulberry32(seed ^ 0x7a1f_c0de);
    this.nav = { city, cols: city.config.cols, rows: city.config.rows, rng: this.rng };
    counts.forEach((n, k) => {
      for (let i = 0; i < n; i += 1) {
        const pool = tints[k] ?? tints[0]!;
        this.agents.push({
          kind: k as TrafficKind,
          tint: pool[Math.floor(this.rng() * pool.length)]!,
          x: 0, z: 0, yaw: 0, speed: 0, tx: 0, tz: 0, t2x: 0, t2z: 0, stage: 0, ni: 0, nj: 0, dir: 0, lane: 0,
          top: 0, stuck: 0, ghost: 0, kbX: 0, kbZ: 0, spin: 0, taken: false, wrecked: false,
          // ~45% of two-wheelers carry a random pillion (GTA-style ambient)
          hasPillion: isTwoWheeler(k as TrafficKind) && this.rng() < 0.45,
          blinker: 0, turnBlinker: 0, braking: false, laneTimer: 0, laneStrafe: 0, approachDir: 0,
          exitLane: 0, appearT: 0,
        });
      }
    });
  }

  seed(px: number, pz: number, pyaw = 0): void {
    // Most of the fleet starts on nearby roads so the street feels alive immediately
    for (let i = 0; i < this.agents.length; i += 1) {
      const a = this.agents[i]!;
      if (i % 5 !== 0) placeNearbyAgent(this.nav, a, px, pz);
      else respawnAgent(this.nav, a, px, pz, pyaw);
      a.speed = 3 + this.rng() * 5;
      a.appearT = 0;
    }
  }

  update(dt: number, px: number, pz: number, obstacles: readonly Obstacle[], pyaw = 0): void {
    const agents = this.agents;
    this.frame += 1;
    const cull = ambientLodAt(this.nav.city, px, pz).trafficCull;
    for (let n = 0; n < agents.length; n += 1) {
      const a = agents[n]!;
      // Wrecked / taken always tick (wreck fade / early-out is cheap).
      if (!a.taken && !a.wrecked) {
        const d2 = (a.x - px) ** 2 + (a.z - pz) ** 2;
        const lod = trafficTickLod(d2, cull);
        if (!trafficShouldTick(lod, n, this.frame)) continue;
      }
      stepAgent(this.nav, agents, n, dt, px, pz, obstacles, pyaw);
    }
  }
}
