/**
 * Highway corridor between region packs — trail roads + colliders + a midway village.
 */
import { between, mulberry32 } from "../lib/rng.ts";
import type { CorridorSpec } from "./atlas.ts";
import type { Aabb, Prop, TrailRoad, VillageSettlement } from "./types-data.ts";

export type CorridorBuild = {
  trails: TrailRoad[];
  boxes: Aabb[];
  trees: { x: number; z: number; s: number; color: number }[];
  lamps: { x: number; z: number; rot: number }[];
  stalls: Prop[];
  villages: VillageSettlement[];
  /** Suggested spawn for highway dhaba / village square. */
  villageSpawn: { x: number; z: number; yaw: number };
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function samplePolyline(
  points: { x: number; z: number }[],
  spacing: number,
): { x: number; z: number; yaw: number; t: number }[] {
  const out: { x: number; z: number; yaw: number; t: number }[] = [];
  let total = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    const dz = points[i + 1].z - points[i].z;
    const len = Math.hypot(dx, dz);
    segLens.push(len);
    total += len;
  }
  if (total < 1) return out;
  const n = Math.max(2, Math.ceil(total / spacing));
  for (let i = 0; i <= n; i += 1) {
    const dist = (i / n) * total;
    let acc = 0;
    let seg = 0;
    while (seg < segLens.length - 1 && acc + segLens[seg] < dist) {
      acc += segLens[seg];
      seg += 1;
    }
    const local = (dist - acc) / Math.max(1e-6, segLens[seg]);
    const a = points[seg];
    const b = points[seg + 1];
    const x = lerp(a.x, b.x, local);
    const z = lerp(a.z, b.z, local);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    out.push({ x, z, yaw, t: i / n });
  }
  return out;
}

export function buildCorridor(spec: CorridorSpec, seed: number): CorridorBuild {
  const rng = mulberry32(seed ^ 0xc0ffee);
  const samples = samplePolyline(spec.points, 36);
  const trail: TrailRoad = {
    kind: "village",
    half: spec.halfWidth,
    points: samples.map((s) => ({ x: s.x, z: s.z })),
  };

  const boxes: Aabb[] = [];
  const trees: CorridorBuild["trees"] = [];
  const lamps: CorridorBuild["lamps"] = [];
  const stalls: Prop[] = [];

  // Guardrail / shoulder colliders along segments (thin AABBs beside the road).
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const nx = len > 1e-6 ? -dz / len : 0;
    const nz = len > 1e-6 ? dx / len : 1;
    const hw = spec.halfWidth + 0.4;
    for (const side of [-1, 1]) {
      const cx = mx + nx * hw * side;
      const cz = mz + nz * hw * side;
      const along = Math.max(len / 2, 1);
      boxes.push({
        minX: cx - Math.abs(nx) * 0.35 - Math.abs(nz) * along,
        maxX: cx + Math.abs(nx) * 0.35 + Math.abs(nz) * along,
        minZ: cz - Math.abs(nz) * 0.35 - Math.abs(nx) * along,
        maxZ: cz + Math.abs(nz) * 0.35 + Math.abs(nx) * along,
        h: 0.8,
      });
    }
    if (i % 3 === 0) {
      lamps.push({
        x: mx + nx * (spec.halfWidth + 2.2),
        z: mz + nz * (spec.halfWidth + 2.2),
        rot: a.yaw,
      });
    }
    if (i % 5 === 0) {
      trees.push({
        x: mx - nx * (spec.halfWidth + 6 + between(rng, 0, 4)),
        z: mz - nz * (spec.halfWidth + 6 + between(rng, 0, 4)),
        s: between(rng, 0.9, 1.4),
        color: 0x3f7a3a,
      });
    }
  }

  const villageT = spec.villageAt ?? 0.5;
  const vs = samples[Math.min(samples.length - 1, Math.floor(villageT * (samples.length - 1)))];
  const side = vs.yaw + Math.PI / 2;
  const vx = vs.x + Math.cos(side) * (spec.halfWidth + 18);
  const vz = vs.z - Math.sin(side) * (spec.halfWidth + 18);

  const huts: VillageSettlement["huts"] = [];
  for (let i = 0; i < 5; i += 1) {
    const ang = (i / 5) * Math.PI * 2;
    huts.push({
      x: vx + Math.cos(ang) * 8,
      z: vz + Math.sin(ang) * 8,
      w: between(rng, 4, 7),
      d: between(rng, 4, 6),
      h: between(rng, 2.8, 3.6),
      rot: ang,
      color: 0xc98a5e,
    });
  }

  stalls.push({
    x: vx + Math.cos(side) * 4,
    z: vz - Math.sin(side) * 4,
    rot: vs.yaw,
    s: 1,
    v: 0,
  });

  const village: VillageSettlement = {
    x: vx,
    z: vz,
    yaw: vs.yaw,
    label: "Highway Village",
    huts,
  };

  // Soft ground colliders under hut footprints.
  for (const h of huts) {
    boxes.push({
      minX: h.x - h.w / 2,
      maxX: h.x + h.w / 2,
      minZ: h.z - h.d / 2,
      maxZ: h.z + h.d / 2,
      h: h.h,
    });
  }

  return {
    trails: [trail],
    boxes,
    trees,
    lamps,
    stalls,
    villages: [village],
    villageSpawn: { x: vx + 6, z: vz + 6, yaw: vs.yaw },
  };
}
