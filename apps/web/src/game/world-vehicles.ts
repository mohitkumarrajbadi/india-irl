/** World parked vehicles — enterable freeroam slots (not summonable). */
import * as THREE from "three";
import type { CityData } from "../world/types.ts";

const dummy = new THREE.Object3D();

/** World prop kind → player VehicleKind. World: 0 bike, 1 auto, 2 cab. */
export function worldKindToVehicle(kind: 0 | 1 | 2): 1 | 2 | 3 {
  if (kind === 0) return 2;
  if (kind === 2) return 3;
  return 1;
}

export type WorldParkedHit = {
  index: number;
  kind: 1 | 2 | 3;
  x: number;
  z: number;
  yaw: number;
};

/** Visual handles written by CityProps so claimed slots can hide. */
export type ParkedVisualBucket = {
  mesh: THREE.InstancedMesh;
  glass: THREE.InstancedMesh | null;
  /** city.parked index for each instance */
  cityIndices: number[];
};

export const parkedVisuals: {
  buckets: ParkedVisualBucket[];
  claimed: Set<number>;
} = {
  buckets: [],
  claimed: new Set(),
};

export function resetParkedVisuals(): void {
  parkedVisuals.buckets.length = 0;
  parkedVisuals.claimed.clear();
}

export function registerParkedBucket(bucket: ParkedVisualBucket): void {
  parkedVisuals.buckets.push(bucket);
}

/** Wide interact reach so curb colliders / camera offset don't block F. */
const ENTER_R2 = 18 * 18;

export function findNearestWorldParked(
  x: number,
  z: number,
  city: CityData,
  exclude?: number | null,
): WorldParkedHit | null {
  let best: WorldParkedHit | null = null;
  let bestD = ENTER_R2;
  for (let i = 0; i < city.parked.length; i += 1) {
    if (exclude != null && i === exclude) continue;
    if (parkedVisuals.claimed.has(i)) continue;
    const p = city.parked[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d >= bestD) continue;
    const kind = worldKindToVehicle(p.kind as 0 | 1 | 2);
    bestD = d;
    best = { index: i, kind, x: p.x, z: p.z, yaw: p.rot };
  }
  return best;
}

function writeInstance(
  mesh: THREE.InstancedMesh,
  instance: number,
  x: number,
  z: number,
  yaw: number,
  visible: boolean,
): void {
  if (visible) {
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
  } else {
    dummy.position.set(0, -50, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
  }
  dummy.updateMatrix();
  mesh.setMatrixAt(instance, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
}

/** Hide / show claimed world parked meshes. */
export function syncParkedClaimVisual(city: CityData, cityIndex: number, visible: boolean): void {
  const p = city.parked[cityIndex];
  if (!p) return;
  for (const b of parkedVisuals.buckets) {
    const inst = b.cityIndices.indexOf(cityIndex);
    if (inst < 0) continue;
    writeInstance(b.mesh, inst, p.x, p.z, p.rot, visible);
    if (b.glass) writeInstance(b.glass, inst, p.x, p.z, p.rot, visible);
  }
}

export function claimWorldParked(city: CityData, index: number): void {
  parkedVisuals.claimed.add(index);
  syncParkedClaimVisual(city, index, false);
}

export function releaseWorldParked(
  city: CityData,
  index: number,
  pose: { x: number; z: number; yaw: number },
): void {
  const p = city.parked[index];
  if (p) {
    p.x = pose.x;
    p.z = pose.z;
    p.rot = pose.yaw;
  }
  parkedVisuals.claimed.delete(index);
  syncParkedClaimVisual(city, index, true);
}
