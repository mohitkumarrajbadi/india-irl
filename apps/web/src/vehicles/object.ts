import * as THREE from "three";
import { vertexMat } from "../gfx/geo";
import type { CityConfig } from "../world/types";
import { chassisVisual } from "./chassis-visual";
import { attachIndicators, setIndicatorFlash, type BlinkerSide } from "./indicators";
import { buildAuto, buildBike, buildCar, glassMaterial, type Model } from "./models";

const cache = new Map<string, Model>();
const RUST = new THREE.Color("#3a2a22");
const tmpColor = new THREE.Color();

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
  indicators: THREE.Mesh[];
  setBlinkers: (side: BlinkerSide, flashOn: boolean) => void;
  /** 0 wrecked … 1 pristine — scuffs, crumple, dull paint. */
  setChassisHealth: (health: number) => void;
};

/** Bikes are tinted per rider so friends can tell scooters apart. */
export function createVehicle(kind: 1 | 2 | 3, cfg: CityConfig, tint: string): VehicleObject {
  const m = model(kind, cfg);
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const material = vertexMat.clone() as THREE.MeshStandardMaterial;
  if (kind === 2) material.color.set(tint);
  const baseColor = material.color.clone();
  const baseRough = material.roughness;
  const baseMetal = material.metalness;
  const body = new THREE.Mesh(m.body, material);
  body.castShadow = true;
  tilt.add(body);

  let glass: THREE.Mesh | null = null;
  let glassMat: THREE.MeshStandardMaterial | null = null;
  let glassOpacity = 0.4;
  if (m.glass) {
    glassMat = glassMaterial.clone() as THREE.MeshStandardMaterial;
    glassOpacity = glassMat.opacity;
    glass = new THREE.Mesh(m.glass, glassMat);
    glass.renderOrder = 2;
    tilt.add(glass);
  }
  const indicators = attachIndicators(tilt, kind);
  let lastHealth = 1;

  return {
    root,
    tilt,
    kind,
    indicators,
    setBlinkers: (side, flashOn) => setIndicatorFlash(indicators, side, flashOn),
    setChassisHealth: (health: number) => {
      const h = Math.max(0, Math.min(1, health));
      if (Math.abs(h - lastHealth) < 0.015) return;
      lastHealth = h;
      const v = chassisVisual(h);
      material.color.copy(tmpColor.copy(baseColor).lerp(RUST, v.rustMix));
      material.roughness = Math.min(1, baseRough + v.roughAdd);
      material.metalness = Math.max(0, baseMetal * v.metalScale);
      tilt.scale.set(v.scaleX, v.scaleY, v.scaleZ);
      body.rotation.z = v.bodyRotZ;
      body.rotation.x = v.bodyRotX;
      if (glassMat) {
        glassMat.opacity = glassOpacity * v.glassMul;
        glassMat.needsUpdate = true;
      }
    },
  };
}
