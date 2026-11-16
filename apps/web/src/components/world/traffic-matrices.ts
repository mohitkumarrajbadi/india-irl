import type * as THREE from "three";
import type { TrafficSim } from "@/vehicles/traffic";
import { flyoverHeightAt, heightAt, underpassHeightAt } from "@/world/terrain-sample";
import type { CityData } from "@/world/types";

type MeshPair = { body: THREE.InstancedMesh; glass: THREE.InstancedMesh | null };

/** Must match max appearT set in traffic-nav (fade-in length). */
const APPEAR_DUR = 0.45;

/**
 * Cheap traffic height — urban fabric is flat (y=0).
 * Only sample flyover / underpass / apron when the agent is near those volumes.
 */
function trafficSurfaceY(city: CityData | undefined, x: number, z: number): number {
  if (!city) return 0;
  try {
    const fo = city.flyover;
    if (fo && z >= fo.z0 - 2 && z <= fo.z1 + 2 && Math.abs(x - fo.x) <= fo.half + 2) {
      const y = flyoverHeightAt(city, x, z);
      if (y != null) return y;
    }
    const u = city.underpass;
    if (u) {
      const y = underpassHeightAt(city, x, z);
      if (y != null) return y;
    }
    const { bounds } = city;
    if (x < bounds.minX - 2 || x > bounds.maxX + 2 || z < bounds.minZ - 2 || z > bounds.maxZ + 2) {
      return heightAt(city, x, z);
    }
  } catch {
    return 0;
  }
  return 0;
}

/** Write agent poses into instanced body/glass matrices. */
export function writeTrafficMatrices(sim: TrafficSim, meshes: MeshPair[]): void {
  const city = sim.city;
  const idx = [0, 0, 0, 0, 0];
  for (const a of sim.agents) {
    const k = a.kind;
    const i = idx[k]++;
    const sin = Math.sin(a.yaw);
    const cos = Math.cos(a.yaw);
    const { body, glass } = meshes[k]!;
    const e = body.instanceMatrix.array as Float32Array;
    const o = i * 16;
    // Player-driven chassis — actor mesh owns the visual.
    if (a.taken) {
      e[o] = 0; e[o + 1] = 0; e[o + 2] = 0; e[o + 3] = 0;
      e[o + 4] = 0; e[o + 5] = 0; e[o + 6] = 0; e[o + 7] = 0;
      e[o + 8] = 0; e[o + 9] = 0; e[o + 10] = 0; e[o + 11] = 0;
      e[o + 12] = 0; e[o + 13] = -80; e[o + 14] = 0; e[o + 15] = 0;
      if (glass) (glass.instanceMatrix.array as Float32Array).set(e.subarray(o, o + 16), o);
      continue;
    }
    // Fade-in scale after respawn (wrecked bikes skip hide — stay at full scale).
    const fade = a.wrecked
      ? 1
      : a.appearT <= 0
        ? 1
        : Math.max(0.2, 1 - (a.appearT / APPEAR_DUR) * (a.appearT / APPEAR_DUR));
    const flying = Math.hypot(a.kbX, a.kbZ) > 0.4;
    const roll = flying ? Math.sin(a.spin * 0.35) * Math.min(1.2, Math.hypot(a.kbX, a.kbZ) * 0.08) : 0;
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const groundY = trafficSurfaceY(city, a.x, a.z);
    const lift = flying ? Math.min(1.8, Math.hypot(a.kbX, a.kbZ) * 0.06) : 0;
    e[o] = cos * cr * fade; e[o + 1] = sr * fade; e[o + 2] = -sin * cr * fade; e[o + 3] = 0;
    e[o + 4] = -cos * sr * fade; e[o + 5] = cr * fade; e[o + 6] = sin * sr * fade; e[o + 7] = 0;
    e[o + 8] = sin * fade; e[o + 9] = 0; e[o + 10] = cos * fade; e[o + 11] = 0;
    e[o + 12] = a.x;
    e[o + 13] = groundY + lift;
    e[o + 14] = a.z;
    e[o + 15] = 1;
    if (glass) (glass.instanceMatrix.array as Float32Array).set(e.subarray(o, o + 16), o);
  }
  for (let k = 0; k < meshes.length; k += 1) {
    const { body, glass } = meshes[k]!;
    body.instanceMatrix.needsUpdate = true;
    if (glass) glass.instanceMatrix.needsUpdate = true;
  }
}
