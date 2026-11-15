/** Parked bikes, autos, and cabs at the kerb — enterable freeroam props. */
import * as THREE from "three";
import { registerParkedBucket, resetParkedVisuals } from "@/game/world-vehicles";
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { buildAuto, buildBike, buildCar } from "@/vehicles/models";
import { BIKE_TINTS, type PropBuildCtx } from "./city-props-ctx";

export function buildParked(ctx: PropBuildCtx): void {
  resetParkedVisuals();
  const { city, add, disposables } = ctx;
  const bikes: number[] = [];
  const autos: number[] = [];
  const cabs: number[] = [];
  for (let i = 0; i < city.parked.length; i += 1) {
    const k = city.parked[i].kind;
    if (k === 0) bikes.push(i);
    else if (k === 2) cabs.push(i);
    else autos.push(i);
  }

  if (bikes.length) {
    const bikeModel = buildBike();
    const mesh = makeInstanced(
      bikeModel.body,
      vertexMat,
      bikes.length,
      (i, o) => {
        const p = city.parked[bikes[i]];
        o.position.set(p.x, 0, p.z);
        o.rotation.y = p.rot;
      },
      { cast: true, color: (i) => BIKE_TINTS[city.parked[bikes[i]].v % BIKE_TINTS.length] },
    );
    add(mesh);
    registerParkedBucket({ mesh, glass: null, cityIndices: bikes });
    disposables.push(bikeModel.body);
  }

  if (autos.length) {
    const autoModel = buildAuto(city.config.livery.auto);
    const mesh = makeInstanced(
      autoModel.body,
      vertexMat,
      autos.length,
      (i, o) => {
        const p = city.parked[autos[i]];
        o.position.set(p.x, 0, p.z);
        o.rotation.y = p.rot;
      },
      { cast: true },
    );
    add(mesh);
    let glass: THREE.InstancedMesh | null = null;
    if (autoModel.glass) {
      glass = makeInstanced(
        autoModel.glass,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.4,
          roughness: 0.1,
        }),
        autos.length,
        (i, o) => {
          const p = city.parked[autos[i]];
          o.position.set(p.x, 0, p.z);
          o.rotation.y = p.rot;
        },
      );
      add(glass);
    }
    registerParkedBucket({ mesh, glass, cityIndices: autos });
    disposables.push(autoModel.body);
  }

  if (cabs.length) {
    const cabModel = buildCar(city.config.livery.cab);
    const mesh = makeInstanced(
      cabModel.body,
      vertexMat,
      cabs.length,
      (i, o) => {
        const p = city.parked[cabs[i]];
        o.position.set(p.x, 0, p.z);
        o.rotation.y = p.rot;
      },
      { cast: true },
    );
    add(mesh);
    let glass: THREE.InstancedMesh | null = null;
    if (cabModel.glass) {
      glass = makeInstanced(
        cabModel.glass,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.4,
          roughness: 0.1,
        }),
        cabs.length,
        (i, o) => {
          const p = city.parked[cabs[i]];
          o.position.set(p.x, 0, p.z);
          o.rotation.y = p.rot;
        },
      );
      add(glass);
    }
    registerParkedBucket({ mesh, glass, cityIndices: cabs });
    disposables.push(cabModel.body);
  }
}
