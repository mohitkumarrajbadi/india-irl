/** Street lamps + night glow pools + budgeted real lights near the player. */
import * as THREE from "three";
import { makeInstanced } from "@/gfx/instancing";
import { glowDisc, lampPost } from "@/gfx/props";
import { quality } from "@/game/quality";
import type { PropBuildCtx } from "./city-props-ctx";
import { registerDestMesh } from "./dest-register";

export type LampNightMats = {
  headMat: THREE.MeshBasicMaterial;
  poolMat: THREE.MeshBasicMaterial;
  pools: THREE.InstancedMesh;
  lightsRoot: THREE.Group;
  /** Downward spots that paint the road; paired point fill. */
  spots: THREE.SpotLight[];
  points: THREE.PointLight[];
};

const LIGHT_BUDGET = { low: 3, medium: 5, high: 7 } as const;
const ARM = 1.7;
const HEAD_Y = 6.95;

function lightBudget(): number {
  return LIGHT_BUDGET[quality.active.id] ?? 6;
}

export function buildLamps(ctx: PropBuildCtx): LampNightMats {
  const { city, add, disposables, registerDest } = ctx;
  const lamp = lampPost();
  const lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 });
  const headMat = new THREE.MeshBasicMaterial({
    color: "#888888",
    fog: true,
    toneMapped: false,
  });
  const poolGeo = new THREE.CircleGeometry(5.8, 28);
  poolGeo.rotateX(-Math.PI / 2);
  const poolTex = glowDisc();
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    color: "#d4893a",
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
    fog: true,
    // Tone-map pools so they don't blow to white under ACES
    toneMapped: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const lampIdx = city.lamps.map((_, i) => i);
  const postMesh = add(
    makeInstanced(
      lamp.post,
      lampMat,
      city.lamps.length,
      (i, o) => {
        const l = city.lamps[i];
        o.position.set(l.x, 0, l.z);
        o.rotation.y = l.rot;
      },
      { cast: true },
    ),
  );
  const headMesh = add(
    makeInstanced(lamp.head, headMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x, 0, l.z);
      o.rotation.y = l.rot;
    }),
  );
  registerDestMesh(registerDest, "lamp", postMesh, city.lamps.length, lampIdx, headMesh);
  const pools = add(
    makeInstanced(poolGeo, poolMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x + Math.sin(l.rot) * ARM, 0.055, l.z + Math.cos(l.rot) * ARM);
    }),
  );
  pools.renderOrder = 3;

  const lightsRoot = new THREE.Group();
  lightsRoot.name = "street-lamp-lights";
  const spots: THREE.SpotLight[] = [];
  const points: THREE.PointLight[] = [];
  const budget = lightBudget();
  for (let i = 0; i < budget; i += 1) {
    const target = new THREE.Object3D();
    target.position.set(0, -8, 0);
    // Warm sodium; intensity set each frame (candela). Softer decay so ground 7m below still reads.
    const spot = new THREE.SpotLight("#ffc078", 0, 42, 0.95, 0.55, 1.25);
    spot.castShadow = false;
    spot.visible = false;
    spot.target = target;
    spot.add(target);
    lightsRoot.add(spot);

    const point = new THREE.PointLight("#ffb860", 0, 26, 1.6);
    point.castShadow = false;
    point.visible = false;
    lightsRoot.add(point);

    spots.push(spot);
    points.push(point);
  }

  disposables.push(lamp.post, lamp.head, lampMat, headMat, poolGeo, poolTex, poolMat, {
    dispose() {
      for (const s of spots) s.dispose();
      for (const p of points) p.dispose();
    },
  });
  return { headMat, poolMat, pools, lightsRoot, spots, points };
}

type LampPose = { x: number; z: number; rot: number };

const nearBuf: { i: number; d2: number }[] = [];

/** Snap budgeted lights onto nearest street lamps; intensity from night glow. */
export function updateLampLights(
  lamps: readonly LampPose[],
  spots: THREE.SpotLight[],
  points: THREE.PointLight[],
  px: number,
  pz: number,
  night: number,
  intensity: number,
): void {
  const on = night > 0.05 && intensity > 0.05;
  if (!on) {
    for (const s of spots) {
      s.intensity = 0;
      s.visible = false;
    }
    for (const p of points) {
      p.intensity = 0;
      p.visible = false;
    }
    return;
  }

  nearBuf.length = 0;
  const maxR2 = 60 * 60;
  for (let i = 0; i < lamps.length; i += 1) {
    const l = lamps[i]!;
    const dx = l.x - px;
    const dz = l.z - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 > maxR2) continue;
    nearBuf.push({ i, d2 });
  }
  nearBuf.sort((a, b) => a.d2 - b.d2);

  const n = Math.min(spots.length, nearBuf.length);
  for (let s = 0; s < spots.length; s += 1) {
    const spot = spots[s]!;
    const point = points[s]!;
    if (s >= n) {
      spot.intensity = 0;
      spot.visible = false;
      point.intensity = 0;
      point.visible = false;
      continue;
    }
    const l = lamps[nearBuf[s]!.i]!;
    const sin = Math.sin(l.rot);
    const cos = Math.cos(l.rot);
    const hx = l.x + sin * ARM;
    const hz = l.z + cos * ARM;
    spot.position.set(hx, HEAD_Y, hz);
    // Local target: down onto the carriageway ahead of the arm
    spot.target.position.set(sin * 4, -HEAD_Y + 0.05, cos * 4);
    spot.target.updateMatrixWorld(true);
    point.position.set(hx, 4.2, hz);

    const dist = Math.sqrt(nearBuf[s]!.d2);
    const prox = 1 - Math.min(1, dist / 60);
    // Keep near lamps strong; fall off for budget members farther away
    const gain = intensity * (0.7 + prox * 0.85);
    spot.intensity = gain;
    spot.distance = 34 + prox * 14;
    point.intensity = gain * 0.4;
    point.distance = 20 + prox * 10;
    spot.visible = true;
    point.visible = true;
  }
}
