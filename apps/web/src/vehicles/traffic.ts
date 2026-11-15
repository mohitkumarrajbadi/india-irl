import { mulberry32, type Rng } from "../lib/rng.ts";
import type { CityData } from "../world/types.ts";
import { type Agent, type Obstacle, type TrafficKind } from "./traffic-kinds.ts";
import { respawnAgent, type NavCtx } from "./traffic-nav.ts";
import { stepAgent } from "./traffic-step.ts";

export type { Agent, Obstacle, TrafficKind } from "./traffic-kinds.ts";
export { KIND_INFO } from "./traffic-kinds.ts";

export class TrafficSim {
  readonly agents: Agent[] = [];
  private readonly nav: NavCtx;
  private readonly rng: Rng;

  constructor(city: CityData, counts: [number, number, number, number, number], tints: number[][], seed = city.config.seed) {
    this.rng = mulberry32(seed ^ 0x7a1f_c0de);
    this.nav = { city, cols: city.config.cols, rows: city.config.rows, rng: this.rng };
    counts.forEach((n, k) => {
      for (let i = 0; i < n; i += 1) {
        const pool = tints[k];
        this.agents.push({
          kind: k as TrafficKind,
          tint: pool[Math.floor(this.rng() * pool.length)],
          x: 0, z: 0, yaw: 0, speed: 0, tx: 0, tz: 0, t2x: 0, t2z: 0, stage: 0, ni: 0, nj: 0, dir: 0, lane: 0,
          top: 0, stuck: 0, ghost: 0, kbX: 0, kbZ: 0, spin: 0, taken: false,
          blinker: 0, turnBlinker: 0, braking: false, laneTimer: 0, laneStrafe: 0, approachDir: 0,
        });
      }
    });
  }

  seed(px: number, pz: number): void {
    for (const a of this.agents) respawnAgent(this.nav, a, px, pz);
    for (const a of this.agents) a.speed = 3 + this.rng() * 5;
  }

  update(dt: number, px: number, pz: number, obstacles: readonly Obstacle[]): void {
    const agents = this.agents;
    for (let n = 0; n < agents.length; n += 1) {
      stepAgent(this.nav, agents, n, dt, px, pz, obstacles);
    }
  }
}
