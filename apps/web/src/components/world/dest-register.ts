/** Helpers to bind CityProps instances to DestructibleSim visual buckets. */
import type * as THREE from "three";
import type { DestSource } from "@/game/destructible-catalog";
import type { DestVisualBucket } from "@/game/destructible-sim";

export function mapCitySlots(cityCount: number, activeIndices: number[]): Int32Array {
  const map = new Int32Array(cityCount).fill(-1);
  for (let i = 0; i < activeIndices.length; i += 1) map[activeIndices[i]!] = i;
  return map;
}

export function registerDestMesh(
  register: ((b: DestVisualBucket) => void) | undefined,
  source: DestSource,
  mesh: THREE.InstancedMesh,
  cityCount: number,
  activeIndices: number[],
  meshB?: THREE.InstancedMesh | null,
): void {
  if (!register || activeIndices.length === 0) return;
  register({
    source,
    mesh,
    meshB: meshB ?? null,
    cityToInstance: mapCitySlots(cityCount, activeIndices),
  });
}
