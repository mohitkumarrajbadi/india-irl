/**
 * NPC traffic lamps: headlights, brake tails, amber indicators, nearby SpotLights.
 */
import * as THREE from "three";
import type { TrafficSim } from "@/vehicles/traffic";
import type { Agent, TrafficKind } from "@/vehicles/traffic-kinds";

type Lamp = { x: number; y: number; z: number; s: number };

/** Local-space lamp anchors matching vehicle meshes. */
const HEAD_BASE: Lamp[][] = [
  [{ x: 0, y: 0.82, z: 1.32, s: 0.12 }],
  [{ x: 0, y: 1.0, z: 0.64, s: 0.1 }],
  [
    { x: 0.6, y: 0.78, z: 2.01, s: 0.12 },
    { x: -0.6, y: 0.78, z: 2.01, s: 0.12 },
  ],
  [
    { x: 0.85, y: 0.78, z: 5.12, s: 0.17 },
    { x: -0.85, y: 0.78, z: 5.12, s: 0.17 },
  ],
  [
    { x: 0.75, y: 0.72, z: 3.17, s: 0.15 },
    { x: -0.75, y: 0.72, z: 3.17, s: 0.15 },
  ],
];

const TAIL_BASE: Lamp[][] = [
  [
    { x: 0.45, y: 0.7, z: -1.05, s: 0.07 },
    { x: -0.45, y: 0.7, z: -1.05, s: 0.07 },
  ],
  [{ x: 0, y: 0.72, z: -0.98, s: 0.08 }],
  [
    { x: 0.6, y: 0.8, z: -2.01, s: 0.11 },
    { x: -0.6, y: 0.8, z: -2.01, s: 0.11 },
  ],
  [
    { x: 0.9, y: 0.7, z: -5.05, s: 0.1 },
    { x: -0.9, y: 0.7, z: -5.05, s: 0.1 },
  ],
  [{ x: 0, y: 1.55, z: -3.7, s: 0.24 }],
];

const IND_BASE: { L: Lamp[]; R: Lamp[] }[] = [
  {
    L: [
      { x: 0.55, y: 0.7, z: 1.2, s: 0.08 },
      { x: 0.55, y: 0.7, z: -1.0, s: 0.07 },
    ],
    R: [
      { x: -0.55, y: 0.7, z: 1.2, s: 0.08 },
      { x: -0.55, y: 0.7, z: -1.0, s: 0.07 },
    ],
  },
  {
    L: [
      { x: 0.22, y: 0.72, z: 0.55, s: 0.06 },
      { x: 0.18, y: 0.7, z: -0.92, s: 0.06 },
    ],
    R: [
      { x: -0.22, y: 0.72, z: 0.55, s: 0.06 },
      { x: -0.18, y: 0.7, z: -0.92, s: 0.06 },
    ],
  },
  {
    L: [
      { x: 0.72, y: 0.78, z: 1.95, s: 0.09 },
      { x: 0.72, y: 0.8, z: -1.95, s: 0.09 },
    ],
    R: [
      { x: -0.72, y: 0.78, z: 1.95, s: 0.09 },
      { x: -0.72, y: 0.8, z: -1.95, s: 0.09 },
    ],
  },
  {
    L: [
      { x: 1.0, y: 0.75, z: 5.0, s: 0.1 },
      { x: 1.0, y: 0.72, z: -4.9, s: 0.1 },
    ],
    R: [
      { x: -1.0, y: 0.75, z: 5.0, s: 0.1 },
      { x: -1.0, y: 0.72, z: -4.9, s: 0.1 },
    ],
  },
  {
    L: [
      { x: 0.9, y: 0.72, z: 3.1, s: 0.09 },
      { x: 0.9, y: 1.4, z: -3.5, s: 0.1 },
    ],
    R: [
      { x: -0.9, y: 0.72, z: 3.1, s: 0.09 },
      { x: -0.9, y: 1.4, z: -3.5, s: 0.1 },
    ],
  },
];

/** Map each TrafficKind onto a lamp layout family (0–4 bases). */
const LAMP_FAMILY: TrafficKind[] = [0, 1, 2, 3, 4, 1, 2, 4, 2, 2, 2, 0];

function expandLamps<T>(base: T[]): Record<TrafficKind, T> {
  const out = {} as Record<TrafficKind, T>;
  for (let k = 0; k < LAMP_FAMILY.length; k += 1) {
    out[k as TrafficKind] = base[LAMP_FAMILY[k]!]!;
  }
  return out;
}

const HEADS = expandLamps(HEAD_BASE);
const TAILS = expandLamps(TAIL_BASE);
const INDICATORS = expandLamps(IND_BASE);

export type BeamBudget = 2 | 4 | 6 | 8;

type BeamSlot = {
  group: THREE.Group;
  left: THREE.SpotLight;
  right: THREE.SpotLight;
};

export type TrafficLights = {
  heads: THREE.InstancedMesh;
  tails: THREE.InstancedMesh;
  ambers: THREE.InstancedMesh;
  headMat: THREE.MeshBasicMaterial;
  tailMat: THREE.MeshBasicMaterial;
  amberMat: THREE.MeshBasicMaterial;
  beamsRoot: THREE.Group;
  beams: BeamSlot[];
  dispose: () => void;
};

function countLamps(counts: readonly number[], table: Record<TrafficKind, Lamp[]>): number {
  let n = 0;
  for (let k = 0; k < counts.length; k += 1) n += counts[k]! * table[k as TrafficKind].length;
  return Math.max(1, n);
}

function countIndicators(counts: readonly number[]): number {
  let n = 0;
  for (let k = 0; k < counts.length; k += 1) {
    const side = INDICATORS[k as TrafficKind];
    n += counts[k]! * (side.L.length + side.R.length);
  }
  return Math.max(1, n);
}

function makeBeamSlot(): BeamSlot {
  const group = new THREE.Group();
  group.visible = false;
  const target = new THREE.Object3D();
  target.position.set(0, -0.3, 18);
  group.add(target);
  const mk = (x: number) => {
    const s = new THREE.SpotLight("#fff2d0", 0, 55, 0.5, 0.7, 1.4);
    s.position.set(x, 0.2, 1.4);
    s.target = target;
    s.castShadow = false;
    group.add(s);
    return s;
  };
  return { group, left: mk(0.45), right: mk(-0.45) };
}

export function createTrafficLights(counts: readonly number[], beamBudget: BeamBudget = 6): TrafficLights {
  const headGeo = new THREE.SphereGeometry(1, 8, 6);
  const tailGeo = new THREE.SphereGeometry(1, 8, 6);
  const amberGeo = new THREE.SphereGeometry(1, 8, 6);
  const headMat = new THREE.MeshBasicMaterial({
    color: "#fff1c4", fog: true, toneMapped: false, transparent: true, opacity: 0,
  });
  const tailMat = new THREE.MeshBasicMaterial({
    color: "#ff2a2a", fog: true, toneMapped: false, transparent: true, opacity: 0,
  });
  const amberMat = new THREE.MeshBasicMaterial({
    color: "#ffb000", fog: true, toneMapped: false, transparent: true, opacity: 0,
  });
  const heads = new THREE.InstancedMesh(headGeo, headMat, countLamps(counts, HEADS));
  const tails = new THREE.InstancedMesh(tailGeo, tailMat, countLamps(counts, TAILS));
  const ambers = new THREE.InstancedMesh(amberGeo, amberMat, countIndicators(counts));
  for (const m of [heads, tails, ambers]) {
    m.frustumCulled = false;
    m.count = 0;
    m.renderOrder = 2;
  }

  const beamsRoot = new THREE.Group();
  beamsRoot.name = "traffic-beams";
  const beams: BeamSlot[] = [];
  for (let i = 0; i < beamBudget; i += 1) {
    const slot = makeBeamSlot();
    beams.push(slot);
    beamsRoot.add(slot.group);
  }

  return {
    heads, tails, ambers, headMat, tailMat, amberMat, beamsRoot, beams,
    dispose: () => {
      headGeo.dispose();
      tailGeo.dispose();
      amberGeo.dispose();
      headMat.dispose();
      tailMat.dispose();
      amberMat.dispose();
      heads.dispose();
      tails.dispose();
      ambers.dispose();
      for (const b of beams) {
        b.left.dispose();
        b.right.dispose();
      }
    },
  };
}

function writeLamp(mesh: THREE.InstancedMesh, slot: number, a: Agent, lamp: Lamp, scale = 1): void {
  const sin = Math.sin(a.yaw);
  const cos = Math.cos(a.yaw);
  const flying = Math.hypot(a.kbX, a.kbZ) > 0.4;
  const roll = flying ? Math.sin(a.spin * 0.35) * Math.min(1.2, Math.hypot(a.kbX, a.kbZ) * 0.08) : 0;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const y0 = flying ? Math.min(1.8, Math.hypot(a.kbX, a.kbZ) * 0.06) : 0;
  const s = lamp.s * scale;
  const e = mesh.instanceMatrix.array as Float32Array;
  const o = slot * 16;
  e[o] = cos * cr * s;
  e[o + 1] = sr * s;
  e[o + 2] = -sin * cr * s;
  e[o + 3] = 0;
  e[o + 4] = -cos * sr * s;
  e[o + 5] = cr * s;
  e[o + 6] = sin * sr * s;
  e[o + 7] = 0;
  e[o + 8] = sin * s;
  e[o + 9] = 0;
  e[o + 10] = cos * s;
  e[o + 11] = 0;
  e[o + 12] = a.x + lamp.x * cos + lamp.z * sin;
  e[o + 13] = y0 + lamp.y;
  e[o + 14] = a.z - lamp.x * sin + lamp.z * cos;
  e[o + 15] = 1;
}

const nearBuf: { a: Agent; d2: number }[] = [];

export function writeTrafficLights(
  sim: TrafficSim,
  lights: TrafficLights,
  night: number,
  px: number,
  pz: number,
): void {
  const nightOn = night > 0.05;
  const flash = Math.floor(performance.now() / 380) % 2 === 0;
  lights.heads.visible = nightOn;
  lights.tails.visible = true;
  lights.ambers.visible = true;
  lights.beamsRoot.visible = nightOn;

  const { beams } = lights;
  if (!nightOn) {
    lights.headMat.opacity = 0;
    for (const b of beams) {
      b.group.visible = false;
      b.left.intensity = 0;
      b.right.intensity = 0;
    }
  } else {
    const glow = Math.min(1, (night - 0.05) / 0.55);
    lights.headMat.opacity = 0.45 + glow * 0.55;
    lights.headMat.color.setRGB(1, 0.94, 0.72 + glow * 0.12);
  }
  lights.tailMat.opacity = nightOn ? 0.45 + Math.min(1, (night - 0.05) / 0.55) * 0.5 : 0.85;
  lights.amberMat.opacity = 0.95;

  let hi = 0;
  let ti = 0;
  let ai = 0;
  nearBuf.length = 0;
  for (const a of sim.agents) {
    if (a.taken) continue;
    const k = a.kind as TrafficKind;
    if (nightOn) for (const lamp of HEADS[k]) writeLamp(lights.heads, hi++, a, lamp);
    // Tails: night running lights, or brake/reverse day+night
    if (nightOn || a.braking || a.speed < -0.4) {
      const scale = a.braking || a.speed < -0.4 ? 1.55 : 1;
      for (const lamp of TAILS[k]) writeLamp(lights.tails, ti++, a, lamp, scale);
    }
    if (a.blinker !== 0 && flash) {
      const side = INDICATORS[k];
      const lamps = a.blinker < 0 ? side.L : side.R;
      for (const lamp of lamps) writeLamp(lights.ambers, ai++, a, lamp, 1.35);
    }
    const dx = a.x - px;
    const dz = a.z - pz;
    nearBuf.push({ a, d2: dx * dx + dz * dz });
  }
  lights.heads.count = hi;
  lights.tails.count = ti;
  lights.ambers.count = ai;
  lights.heads.instanceMatrix.needsUpdate = true;
  lights.tails.instanceMatrix.needsUpdate = true;
  lights.ambers.instanceMatrix.needsUpdate = true;

  if (!nightOn) return;

  nearBuf.sort((u, v) => u.d2 - v.d2);
  const power = night * 110;
  const maxDist2 = 55 * 55;
  for (let i = 0; i < beams.length; i += 1) {
    const slot = beams[i]!;
    const hit = nearBuf[i];
    if (!hit || hit.d2 > maxDist2) {
      slot.group.visible = false;
      slot.left.intensity = 0;
      slot.right.intensity = 0;
      continue;
    }
    const a = hit.a;
    const fade = 1 - Math.min(1, Math.sqrt(hit.d2) / 55);
    const intensity = power * (0.55 + 0.45 * fade);
    slot.group.visible = true;
    slot.group.position.set(a.x, 0.8, a.z);
    slot.group.rotation.y = a.yaw;
    slot.left.intensity = intensity;
    slot.right.intensity = intensity;
  }
}
