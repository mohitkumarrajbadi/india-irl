import * as THREE from "three";
import { vertexMat } from "../gfx/geo";
import type { CityConfig } from "../world/types";
import { buildAuto, buildBike, buildCar, glassMaterial, type Model } from "./models";

const cache = new Map<string, Model>();

function model(kind: 1 | 2 | 3, cfg: CityConfig): Model {
  const key = `${kind}:${cfg.id}`;
  let m = cache.get(key);
  if (!m) {
    m = kind === 1 ? buildAuto(cfg.livery.auto) : kind === 2 ? buildBike() : buildCar(cfg.livery.cab);
    cache.set(key, m);
  }
  return m;
}

export type VehicleObject = {
  /** Root, positioned and yawed by the caller. */
  root: THREE.Group;
  /** Child that takes lean / roll. */
  tilt: THREE.Group;
  kind: 1 | 2 | 3;
};

/** Bikes are tinted per rider so friends can tell scooters apart. */
export function createVehicle(kind: 1 | 2 | 3, cfg: CityConfig, tint: string): VehicleObject {
  const m = model(kind, cfg);
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const material = kind === 2 ? vertexMat.clone() : vertexMat;
  if (kind === 2) (material as THREE.MeshStandardMaterial).color.set(tint);
  const body = new THREE.Mesh(m.body, material);
  body.castShadow = true;
  tilt.add(body);
  if (m.glass) {
    const glass = new THREE.Mesh(m.glass, glassMaterial);
    glass.renderOrder = 2;
    tilt.add(glass);
  }
  return { root, tilt, kind };
}
