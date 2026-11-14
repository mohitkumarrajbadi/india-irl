import { clamp, wrapAngle } from "../lib/math.ts";
import { mulberry32, type Rng } from "../lib/rng.ts";
import { lineIndex } from "../world/generate.ts";
import { signalWantScale } from "../world/signals.ts";
import type { CityData, RoadLine } from "../world/types.ts";
import { tickTrafficTumble } from "./traffic-tumble.ts";

/** 0 auto, 1 bike, 2 car, 3 bus, 4 truck. */
export type TrafficKind = 0 | 1 | 2 | 3 | 4;

type KindInfo = { len: number; wid: number; top: number; accel: number; brake: number; turn: number };

export const KIND_INFO: Record<TrafficKind, KindInfo> = {
  0: { len: 2.6, wid: 1.4, top: 11, accel: 4.5, brake: 12, turn: 4.2 },
  1: { len: 1.9, wid: 0.7, top: 14, accel: 6, brake: 13, turn: 3.6 },
  2: { len: 4.1, wid: 1.75, top: 15, accel: 4.8, brake: 14, turn: 5.2 },
  3: { len: 10.2, wid: 2.5, top: 10.5, accel: 2.6, brake: 9, turn: 8.5 },
  4: { len: 8.4, wid: 2.5, top: 9.5, accel: 2.2, brake: 8, turn: 8 },
};

export type Agent = {
  kind: TrafficKind;
  tint: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** Current target and the pending exit waypoint. */
  tx: number;
  tz: number;
  t2x: number;
  t2z: number;
  stage: 0 | 1;
  ni: number;
  nj: number;
  /** Direction index of travel (0 +Z, 1 +X, 2 -Z, 3 -X). */
  dir: number;
  lane: number;
  top: number;
  stuck: number;
  ghost: number;
  /** Knockback while tumbling after a smash. */
  kbX: number;
  kbZ: number;
  spin: number;
};

export type Obstacle = { x: number; z: number; r: number };

const DX = [0, 1, 0, -1];
const DZ = [1, 0, -1, 0];

export class TrafficSim {
  readonly agents: Agent[] = [];
  private readonly city: CityData;
  private readonly cols: number;
  private readonly rows: number;
  /** Shared seed → same initial fleet on every client in the city. */
  private readonly rng: Rng;

  constructor(city: CityData, counts: [number, number, number, number, number], tints: number[][], seed = city.config.seed) {
    this.city = city;
    this.cols = city.config.cols;
    this.rows = city.config.rows;
    this.rng = mulberry32(seed ^ 0x7a1f_c0de);
    counts.forEach((n, k) => {
      for (let i = 0; i < n; i += 1) {
        const pool = tints[k];
        this.agents.push({
          kind: k as TrafficKind,
          tint: pool[Math.floor(this.rng() * pool.length)],
          x: 0, z: 0, yaw: 0, speed: 0, tx: 0, tz: 0, t2x: 0, t2z: 0, stage: 0, ni: 0, nj: 0, dir: 0, lane: 0,
          top: 0, stuck: 0, ghost: 0, kbX: 0, kbZ: 0, spin: 0,
        });
      }
    });
  }

  private roadAlong(i: number, j: number, dir: number): RoadLine {
    // Traveling along Z uses the vertical road at xs[i]; along X uses the horizontal road at zs[j].
    return dir % 2 === 0 ? this.city.roadsX[i] : this.city.roadsZ[j];
  }

  private valid(i: number, j: number): boolean {
    return i >= 0 && i <= this.cols && j >= 0 && j <= this.rows;
  }

  /** Place an agent on the lane between two junctions. */
  private place(a: Agent, i: number, j: number, dir: number): void {
    const { xs, zs } = this.city;
    const ni = i + DX[dir];
    const nj = j + DZ[dir];
    const road = this.roadAlong(i, j, dir);
    a.lane = Math.floor(this.rng() * road.lanes.length);
    const off = road.lanes[a.lane];
    const f = 0.25 + this.rng() * 0.5;
    const x = xs[i] + (xs[ni] - xs[i]) * f;
    const z = zs[j] + (zs[nj] - zs[j]) * f;
    // Left of travel is (dz, -dx).
    a.x = x + DZ[dir] * off;
    a.z = z - DX[dir] * off;
    a.yaw = Math.atan2(DX[dir], DZ[dir]);
    a.speed = 4 + this.rng() * 4;
    a.ni = ni;
    a.nj = nj;
    a.dir = dir;
    a.top = KIND_INFO[a.kind].top * (0.75 + this.rng() * 0.4);
    a.stuck = 0;
    a.ghost = 0;
    a.kbX = 0;
    a.kbZ = 0;
    a.spin = 0;
    this.plan(a);
  }

  /** Choose the next turn at the junction (ni, nj) and set the entry/exit waypoints. */
  private plan(a: Agent): void {
    const { xs, zs } = this.city;
    const d = a.dir;
    const options: number[] = [];
    const weights: number[] = [];
    for (const [turn, w] of [[0, 0.62], [1, 0.19], [3, 0.19]] as const) {
      const d2 = (d + turn) % 4;
      if (this.valid(a.ni + DX[d2], a.nj + DZ[d2])) {
        options.push(d2);
        weights.push(w);
      }
    }
    let d2 = (d + 2) % 4;
    if (options.length > 0) {
      let r = this.rng() * weights.reduce((s, w) => s + w, 0);
      d2 = options[options.length - 1];
      for (let k = 0; k < options.length; k += 1) {
        r -= weights[k];
        if (r <= 0) {
          d2 = options[k];
          break;
        }
      }
    }

    const roadIn = this.roadAlong(a.ni, a.nj, d);
    const roadOut = this.roadAlong(a.ni, a.nj, d2);
    const crossIn = this.roadAlong(a.ni, a.nj, (d + 1) % 4);
    const nx = xs[a.ni];
    const nz = zs[a.nj];
    const offIn = roadIn.lanes[Math.min(a.lane, roadIn.lanes.length - 1)];
    const newLane = Math.floor(this.rng() * roadOut.lanes.length);
    const offOut = roadOut.lanes[newLane];
    const uturn = d2 === (d + 2) % 4;
    // Entry point just before the junction, exit point just after it.
    a.tx = nx + DZ[d] * offIn - DX[d] * (crossIn.half + 0.6);
    a.tz = nz - DX[d] * offIn - DZ[d] * (crossIn.half + 0.6);
    a.t2x = nx + DZ[d2] * offOut + DX[d2] * (roadIn.half + 0.6);
    a.t2z = nz - DX[d2] * offOut + DZ[d2] * (roadIn.half + 0.6);
    if (uturn) {
      a.t2x += DX[d2] * 4;
      a.t2z += DZ[d2] * 4;
    }
    a.lane = newLane;
    a.dir = d2;
    a.stage = 0;
  }

  private respawn(a: Agent, px: number, pz: number): void {
    const { xs, zs } = this.city;
    const pi = lineIndex(xs, px);
    const pj = lineIndex(zs, pz);
    for (let tries = 0; tries < 10; tries += 1) {
      const i = pi + Math.floor(this.rng() * 7) - 3;
      const j = pj + Math.floor(this.rng() * 7) - 3;
      if (!this.valid(i, j)) continue;
      const dir = Math.floor(this.rng() * 4);
      if (!this.valid(i + DX[dir], j + DZ[dir])) continue;
      this.place(a, i, j, dir);
      const d = Math.hypot(a.x - px, a.z - pz);
      if (d > 55 && d < 175) return;
    }
    // Fallback: park it where it will not be noticed.
    this.place(a, clamp(pi, 0, this.cols - 1), clamp(pj, 0, this.rows - 1), 1);
  }

  seed(px: number, pz: number): void {
    for (const a of this.agents) this.respawn(a, px, pz);
    for (const a of this.agents) a.speed = 3 + this.rng() * 5;
  }

  update(dt: number, px: number, pz: number, obstacles: readonly Obstacle[]): void {
    const agents = this.agents;
    for (let n = 0; n < agents.length; n += 1) {
      const a = agents[n];
      const info = KIND_INFO[a.kind];

      const dxp = a.x - px;
      const dzp = a.z - pz;
      if (dxp * dxp + dzp * dzp > 200 * 200) {
        this.respawn(a, px, pz);
        continue;
      }

      // Flying / skidding after player smash — skip path AI
      if (tickTrafficTumble(a, dt)) continue;

      // Desired speed: slow into junctions, lights, and tight turns.
      const toX = a.tx - a.x;
      const toZ = a.tz - a.z;
      const toDist = Math.hypot(toX, toZ);
      const err = wrapAngle(Math.atan2(toX, toZ) - a.yaw);
      let want = a.top;
      if (a.stage === 0 && toDist < 18) want *= 0.7;
      if (Math.abs(err) > 0.5) want *= 0.5;
      // Traffic light at the upcoming junction (ni, nj)
      if (a.stage === 0) {
        const jx = this.city.xs[a.ni] - a.x;
        const jz = this.city.zs[a.nj] - a.z;
        const jDist = Math.hypot(jx, jz);
        want *= signalWantScale(a.ni, a.nj, a.dir, jDist, performance.now() * 0.001);
      }

      if (a.ghost <= 0) {
        const sin = Math.sin(a.yaw);
        const cos = Math.cos(a.yaw);
        const look = 5 + a.speed * 1.0 + info.len * 0.5;
        for (let m = 0; m < agents.length; m += 1) {
          if (m === n) continue;
          const o = agents[m];
          const rx = o.x - a.x;
          const rz = o.z - a.z;
          const along = rx * sin + rz * cos;
          if (along < 0.2 || along > look + KIND_INFO[o.kind].len) continue;
          const lat = rx * cos - rz * sin;
          const oi = KIND_INFO[o.kind];
          if (Math.abs(lat) > (info.wid + oi.wid) * 0.5 + 0.35) continue;
          const gap = along - (info.len + oi.len) * 0.5;
          want = Math.min(want, Math.max(0, (gap - 1.2) * 1.4));
        }
        for (let m = 0; m < obstacles.length; m += 1) {
          const o = obstacles[m];
          const rx = o.x - a.x;
          const rz = o.z - a.z;
          const along = rx * sin + rz * cos;
          if (along < 0 || along > look + 6) continue;
          const lat = rx * cos - rz * sin;
          if (Math.abs(lat) > o.r + info.wid * 0.5 + 0.4) continue;
          want = Math.min(want, Math.max(0, (along - o.r - info.len * 0.5 - 1.5) * 1.5));
        }
      }

      if (a.speed < 0.4 && want < 0.4) {
        a.stuck += dt;
        // Real traffic eventually squeezes through.
        if (a.stuck > 6) {
          a.ghost = 4;
          a.stuck = 0;
        }
      } else a.stuck = Math.max(0, a.stuck - dt);

      const dv = want - a.speed;
      a.speed += clamp(dv, -info.brake * dt, info.accel * dt);

      const maxYaw = a.speed / info.turn;
      a.yaw += clamp(err * 4, -maxYaw, maxYaw) * dt;
      a.x += Math.sin(a.yaw) * a.speed * dt;
      a.z += Math.cos(a.yaw) * a.speed * dt;

      if (toDist < 3.2) {
        if (a.stage === 0) {
          a.tx = a.t2x;
          a.tz = a.t2z;
          a.stage = 1;
        } else {
          a.ni += DX[a.dir];
          a.nj += DZ[a.dir];
          if (!this.valid(a.ni, a.nj)) this.respawn(a, px, pz);
          else this.plan(a);
        }
      }
    }
  }
}
