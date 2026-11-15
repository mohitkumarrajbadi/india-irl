import type * as THREE from "three";
import type { TrafficSim } from "@/vehicles/traffic";

type MeshPair = { body: THREE.InstancedMesh; glass: THREE.InstancedMesh | null };

/** Write agent poses into instanced body/glass matrices. */
export function writeTrafficMatrices(sim: TrafficSim, meshes: MeshPair[]): void {
  const idx = [0, 0, 0, 0, 0];
  for (const a of sim.agents) {
    const k = a.kind;
    const i = idx[k]++;
    const sin = Math.sin(a.yaw);
    const cos = Math.cos(a.yaw);
    const { body, glass } = meshes[k];
    const e = body.instanceMatrix.array as Float32Array;
    const o = i * 16;
    if (a.taken) {
      e[o] = 0; e[o + 1] = 0; e[o + 2] = 0; e[o + 3] = 0;
      e[o + 4] = 0; e[o + 5] = 0; e[o + 6] = 0; e[o + 7] = 0;
      e[o + 8] = 0; e[o + 9] = 0; e[o + 10] = 0; e[o + 11] = 0;
      e[o + 12] = 0; e[o + 13] = -80; e[o + 14] = 0; e[o + 15] = 0;
      if (glass) (glass.instanceMatrix.array as Float32Array).set(e.subarray(o, o + 16), o);
      continue;
    }
    const flying = Math.hypot(a.kbX, a.kbZ) > 0.4;
    const roll = flying ? Math.sin(a.spin * 0.35) * Math.min(1.2, Math.hypot(a.kbX, a.kbZ) * 0.08) : 0;
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    e[o] = cos * cr; e[o + 1] = sr; e[o + 2] = -sin * cr; e[o + 3] = 0;
    e[o + 4] = -cos * sr; e[o + 5] = cr; e[o + 6] = sin * sr; e[o + 7] = 0;
    e[o + 8] = sin; e[o + 9] = 0; e[o + 10] = cos; e[o + 11] = 0;
    e[o + 12] = a.x;
    e[o + 13] = flying ? Math.min(1.8, Math.hypot(a.kbX, a.kbZ) * 0.06) : 0;
    e[o + 14] = a.z;
    e[o + 15] = 1;
    if (glass) (glass.instanceMatrix.array as Float32Array).set(e.subarray(o, o + 16), o);
  }
  for (let k = 0; k < meshes.length; k += 1) {
    const { body, glass } = meshes[k];
    body.instanceMatrix.needsUpdate = true;
    if (glass) glass.instanceMatrix.needsUpdate = true;
  }
}
