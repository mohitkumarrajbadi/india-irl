/**
 * Runtime destructible props — damage states, debris pool, cleanup.
 * Visuals sync via registered InstancedMesh buckets (CityProps).
 */
import * as THREE from "three";
import type { CityData } from "../world/types.ts";
import {
  EXTRA_DEFS,
  LAMP_DEF,
  SHRUB_DEF,
  STALL_DEF,
  TREE_DEF,
  classifyHit,
  debrisCount,
  hitSeverity,
  isSharedBreakSource,
  type BreakMode,
  type DestDef,
  type DestMaterial,
  type DestSource,
} from "./destructible-catalog.ts";

/** Optional net hook — set from `destructible-breaks` (avoids sim↔net cycle). */
type BreakNetHook = (source: DestSource, index: number, free: boolean) => void;
let breakNetHook: BreakNetHook | null = null;

export function setDestructibleBreakHook(fn: BreakNetHook | null): void {
  breakNetHook = fn;
}

export type DestEntry = {
  id: number;
  source: DestSource;
  index: number;
  x: number;
  z: number;
  rot: number;
  /** Render yaw (may differ from world rot for sidewalk facing). */
  drawRot: number;
  s: number;
  hp: number;
  def: DestDef;
  state: "ok" | "damaged" | "broken";
  brokenAt: number;
  /** Extra kind for extras; tree scale gate. */
  kind: number;
};

export type DebrisPiece = {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  life: number;
  maxLife: number;
  material: DestMaterial;
  scale: number;
  /** Tall tumbling pole body vs small shatter chunk. */
  tall: boolean;
};

export type DestVisualBucket = {
  source: DestSource;
  mesh: THREE.InstancedMesh;
  /** Parallel city index → instance slot (or -1). */
  cityToInstance: Int32Array;
  /** Optional secondary mesh (tree crown / lamp head). */
  meshB?: THREE.InstancedMesh | null;
};

const MAX_DEBRIS = 64;
const RESPAWN_MS = 75_000;
const dummy = new THREE.Object3D();

export class DestructibleSim {
  readonly entries: DestEntry[] = [];
  readonly debris: DebrisPiece[] = [];
  readonly buckets: DestVisualBucket[] = [];
  private nextId = 1;
  private readonly circles: { x: number; z: number; r: number }[];

  constructor(city: CityData) {
    this.circles = city.circles as { x: number; z: number; r: number }[];
    for (let i = 0; i < city.stalls.length; i += 1) {
      const p = city.stalls[i];
      this.add("stall", i, p.x, p.z, p.rot, p.rot + Math.PI, p.s, STALL_DEF, 0);
    }
    for (let i = 0; i < city.extras.length; i += 1) {
      const e = city.extras[i];
      const def = EXTRA_DEFS[e.v];
      if (!def) continue;
      const draw = e.v === 6 ? e.rot : e.rot + Math.PI;
      this.add("extra", i, e.x, e.z, e.rot, draw, e.s, def, e.v);
    }
    for (let i = 0; i < city.lamps.length; i += 1) {
      const l = city.lamps[i];
      this.add("lamp", i, l.x, l.z, l.rot, l.rot, 1, LAMP_DEF, 0);
    }
    for (let i = 0; i < city.trees.length; i += 1) {
      const t = city.trees[i];
      // Only smaller trees tip/break — large ones just shake.
      if (t.s > 1.15) continue;
      this.add("tree", i, t.x, t.z, 0, (i * 1.7) % 6.28, t.s, TREE_DEF, 0);
    }
    for (let i = 0; i < city.shrubs.length; i += 1) {
      const s = city.shrubs[i];
      this.add("shrub", i, s.x, s.z, 0, (i * 1.3) % 6.28, s.s, SHRUB_DEF, 0);
    }
    for (let i = 0; i < MAX_DEBRIS; i += 1) {
      this.debris.push({
        alive: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        life: 0,
        maxLife: 1,
        material: "wood",
        scale: 0.2,
        tall: false,
      });
    }
  }

  private add(
    source: DestSource,
    index: number,
    x: number,
    z: number,
    rot: number,
    drawRot: number,
    s: number,
    def: DestDef,
    kind: number,
  ): void {
    this.entries.push({
      id: this.nextId++,
      source,
      index,
      x,
      z,
      rot,
      drawRot,
      s,
      hp: def.hp,
      def,
      state: "ok",
      brokenAt: 0,
      kind,
    });
  }

  registerBucket(bucket: DestVisualBucket): void {
    this.buckets.push(bucket);
  }

  /** Apply vehicle smash. Returns broken label or null. */
  hit(
    x: number,
    z: number,
    yaw: number,
    speed: number,
    halfL: number,
    halfW: number,
    vehicleMass: number,
    now: number,
  ): { label: string; mode: BreakMode; material: DestMaterial; severity: number } | null {
    const v = Math.abs(speed);
    if (v < 2) return null;
    const reach = halfL + 1.4;
    const reach2 = reach * reach;
    let best: DestEntry | null = null;
    let bestD = reach2;
    for (const e of this.entries) {
      if (e.state === "broken") continue;
      if (v < e.def.breakSpeed * 0.55) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2;
      const r = e.def.radius * e.s + halfW;
      if (d >= (r + 0.35) ** 2 || d >= bestD) continue;
      bestD = d;
      best = e;
    }
    if (!best) return null;

    const severity = hitSeverity(v, vehicleMass, best.def);
    const dmg = 6 + severity * 38;
    const hpAfter = best.hp - dmg;
    const phase = classifyHit(severity, hpAfter, best.def);
    if (phase === "ignore") return null;

    best.hp = hpAfter;
    if (phase === "damage") {
      best.state = "damaged";
      this.nudgeVisual(best, 0.12 + severity * 0.18);
      return null;
    }

    this.breakEntry(best, yaw, speed, severity, now, true);
    return {
      label: best.def.label,
      mode: best.def.mode,
      material: best.def.material,
      severity,
    };
  }

  /** Peer broke a shared prop — hide + light debris, no rebroadcast. */
  applyRemoteBreak(source: DestSource, index: number, now: number): void {
    const e = this.entries.find((x) => x.source === source && x.index === index);
    if (!e || e.state === "broken") return;
    this.breakEntry(e, 0, 8, 0.55, now, false);
  }

  /** Peer respawned a shared prop. */
  applyRemoteRespawn(source: DestSource, index: number): void {
    const e = this.entries.find((x) => x.source === source && x.index === index);
    if (!e || e.state !== "broken") return;
    this.respawn(e, false);
  }

  private breakEntry(
    e: DestEntry,
    yaw: number,
    speed: number,
    severity: number,
    now: number,
    broadcast: boolean,
  ): void {
    e.state = "broken";
    e.hp = 0;
    e.brokenAt = now;
    this.hideVisual(e);
    this.disableCircle(e.x, e.z, e.def.radius * e.s + 0.4);
    this.spawnDebris(e, yaw, speed, severity);
    if (broadcast && isSharedBreakSource(e.source)) breakNetHook?.(e.source, e.index, false);
  }

  private disableCircle(x: number, z: number, r: number): void {
    const r2 = r * r;
    for (const c of this.circles) {
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < r2) c.r = 0.02;
    }
  }

  private spawnDebris(e: DestEntry, yaw: number, speed: number, severity: number): void {
    const fx = Math.sin(yaw) * Math.sign(speed || 1);
    const fz = Math.cos(yaw) * Math.sign(speed || 1);
    const closing = Math.abs(speed);

    // Metal poles: whole body tips and flies — GTA knockaway, not shatter.
    if (e.def.mode === "knockaway") {
      const d = this.takeDebrisSlot();
      if (!d) return;
      const throwMul = 0.55 + severity * 1.4 + Math.min(1.2, closing / 18);
      d.alive = true;
      d.x = e.x;
      d.y = 1.2;
      d.z = e.z;
      d.vx = fx * (5 + throwMul * 9) + (Math.random() - 0.5) * 2;
      d.vz = fz * (5 + throwMul * 9) + (Math.random() - 0.5) * 2;
      d.vy = 3.5 + throwMul * 4.5;
      d.spin = (Math.random() > 0.5 ? 1 : -1) * (4 + severity * 8);
      d.life = 0;
      d.maxLife = 3.2 + severity * 1.5;
      d.material = e.def.material;
      d.scale = 0.55 + e.s * 0.35;
      d.tall = true;
      // One small base chunk for dust feel
      const chip = this.takeDebrisSlot();
      if (chip) {
        chip.alive = true;
        chip.x = e.x;
        chip.y = 0.3;
        chip.z = e.z;
        chip.vx = fx * 2 + (Math.random() - 0.5) * 4;
        chip.vz = fz * 2 + (Math.random() - 0.5) * 4;
        chip.vy = 1.5 + Math.random() * 2;
        chip.spin = (Math.random() - 0.5) * 8;
        chip.life = 0;
        chip.maxLife = 1.4;
        chip.material = e.def.material;
        chip.scale = 0.14;
        chip.tall = false;
      }
      return;
    }

    const n = debrisCount(e.def.mode, severity);
    for (let spawned = 0; spawned < n; spawned += 1) {
      const d = this.takeDebrisSlot();
      if (!d) break;
      const side = (Math.random() - 0.5) * 2;
      d.alive = true;
      d.x = e.x + side * 0.4;
      d.y = 0.4 + Math.random() * 0.6;
      d.z = e.z + (Math.random() - 0.5) * 0.4;
      d.vx = fx * (2 + Math.random() * 6 * severity) + side * 3;
      d.vz = fz * (2 + Math.random() * 6 * severity) + (Math.random() - 0.5) * 3;
      d.vy = 2.5 + Math.random() * 4 * severity;
      d.spin = (Math.random() - 0.5) * 10;
      d.life = 0;
      d.maxLife = 1.8 + Math.random() * 1.4;
      d.material = e.def.material;
      d.scale = e.def.mode === "scatter" ? 0.12 + Math.random() * 0.18 : 0.18 + Math.random() * 0.22;
      d.tall = false;
    }
  }

  /** Free slot, or reclaim the piece with least life left. */
  private takeDebrisSlot(): DebrisPiece | null {
    let oldest: DebrisPiece | null = null;
    let oldestRemain = Infinity;
    for (const d of this.debris) {
      if (!d.alive) return d;
      const remain = d.maxLife - d.life;
      if (remain < oldestRemain) {
        oldestRemain = remain;
        oldest = d;
      }
    }
    return oldest;
  }

  private writeInstance(
    mesh: THREE.InstancedMesh,
    slot: number,
    x: number,
    y: number,
    z: number,
    rot: number,
    sx: number,
    sy: number,
    sz: number,
  ): void {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(slot, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  private hideVisual(e: DestEntry): void {
    for (const b of this.buckets) {
      if (b.source !== e.source) continue;
      const slot = b.cityToInstance[e.index];
      if (slot < 0) continue;
      this.writeInstance(b.mesh, slot, e.x, -40, e.z, e.rot, 0, 0, 0);
      if (b.meshB) this.writeInstance(b.meshB, slot, e.x, -40, e.z, e.rot, 0, 0, 0);
    }
  }

  private nudgeVisual(e: DestEntry, lean: number): void {
    for (const b of this.buckets) {
      if (b.source !== e.source) continue;
      const slot = b.cityToInstance[e.index];
      if (slot < 0) continue;
      if (e.def.mode === "bend" || e.def.mode === "tip") {
        dummy.position.set(e.x, 0, e.z);
        dummy.rotation.set(lean * 0.9, e.drawRot, lean * 0.35);
        dummy.scale.set(e.s, e.s, e.s);
        dummy.updateMatrix();
        b.mesh.setMatrixAt(slot, dummy.matrix);
        b.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  tick(dt: number, now: number): void {
    for (const d of this.debris) {
      if (!d.alive) continue;
      d.life += dt;
      d.vy -= 14 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.spin += dt * 4;
      if (d.y < 0.05) {
        d.y = 0.05;
        d.vy *= -0.25;
        d.vx *= 0.7;
        d.vz *= 0.7;
      }
      if (d.life >= d.maxLife) d.alive = false;
    }
    for (const e of this.entries) {
      if (e.state !== "broken" || now - e.brokenAt < RESPAWN_MS) continue;
      this.respawn(e, true);
    }
  }

  private respawn(e: DestEntry, broadcast: boolean): void {
    e.state = "ok";
    e.hp = e.def.hp;
    e.brokenAt = 0;
    for (const b of this.buckets) {
      if (b.source !== e.source) continue;
      const slot = b.cityToInstance[e.index];
      if (slot < 0) continue;
      if (e.source === "tree") {
        this.writeInstance(b.mesh, slot, e.x, 0, e.z, e.drawRot, e.s, e.s, e.s);
        if (b.meshB) {
          this.writeInstance(
            b.meshB,
            slot,
            e.x,
            4.35 * e.s,
            e.z,
            e.drawRot,
            1.55 * e.s,
            1.35 * e.s,
            1.55 * e.s,
          );
        }
      } else {
        this.writeInstance(b.mesh, slot, e.x, 0, e.z, e.drawRot, e.s, e.s, e.s);
        if (b.meshB) this.writeInstance(b.meshB, slot, e.x, 0, e.z, e.drawRot, e.s, e.s, e.s);
      }
    }
    this.circles.push({ x: e.x, z: e.z, r: e.def.radius * e.s });
    if (broadcast && isSharedBreakSource(e.source)) breakNetHook?.(e.source, e.index, true);
  }
}
