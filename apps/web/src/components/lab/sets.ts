/** Model lab line-ups: every procedural model, grouped for side-by-side review. */
import * as THREE from "three";
import { DEFAULT_LOOK, type Look } from "@/avatar/appearance";
import { buildRig, poseRig, type Rig } from "@/avatar/rig";
import { vertexMat } from "@/gfx/geo";
import { buildBus, buildTruck, buildAuto, buildBike, buildCar, glassMaterial, type Model } from "@/vehicles/models";
import { createVehicle } from "@/vehicles/object";
import { CITIES } from "@/world/cities";

export type LabItem = { obj: THREE.Object3D; label: string; width: number };
export type LabSet = { items: LabItem[]; tick?: (dt: number, time: number) => void };

const LOOKS: Partial<Look>[] = [
  // Body types Lean · Regular · Broad (short sleeve / shirt / kurta)
  { body: 0, skin: 1, hair: 8, hairColor: 0, top: 0, topColor: 9, bottom: 2, bottomColor: 0, shoe: 0 },
  { body: 1, skin: 3, hair: 0, hairColor: 1, top: 1, topColor: 3, bottom: 1, bottomColor: 1, shoe: 1, shoeColor: 1 },
  { body: 2, skin: 4, hair: 4, hairColor: 0, top: 3, topColor: 2, bottom: 1, bottomColor: 1, shoe: 1, shoeColor: 1 },
  // Garment gallery
  { skin: 3, hair: 1, top: 3, topColor: 4, bottom: 5, bottomColor: 4, shoe: 2, shoeColor: 4, acc: 16 },
  { skin: 0, hair: 3, hairColor: 5, top: 2, topColor: 7, bottom: 0, bottomColor: 0, acc: 1 },
  { skin: 5, hair: 2, top: 4, topColor: 6, shoe: 2, shoeColor: 5, acc: 16 },
  { skin: 2, hair: 5, top: 5, topColor: 10, bottom: 0, shoe: 0, acc: 8 },
  { skin: 6, hair: 7, hairColor: 1, top: 6, topColor: 3, bottom: 3, bottomColor: 3, shoe: 1, acc: 64 },
  { skin: 1, hair: 9, top: 0, topColor: 5, bottom: 4, bottomColor: 7, shoe: 2 },
  { skin: 3, hair: 6, top: 2, topColor: 0, bottom: 0, body: 2, shoe: 0, acc: 32 },
];

export function avatarSet(emote: number): LabSet {
  const rigs: Rig[] = LOOKS.map((l) => buildRig({ ...DEFAULT_LOOK, ...l }));
  // When emote=0, cycle gestures across the lineup so hands are easy to review.
  const cycle = emote > 0 ? null : [0, 2, 1, 3, 7, 8, 9, 4, 1, 6];
  return {
    items: rigs.map((rig, i) => ({ obj: rig.root, label: `look ${i}`, width: 0.95 })),
    tick: (dt, time) => {
      rigs.forEach((rig, i) =>
        poseRig(
          rig,
          {
            phase: 0,
            speed: 0,
            emote: cycle ? cycle[i % cycle.length]! : emote,
            emoteT: time,
            seat: 0,
            time: time + i * 1.3,
          },
          dt,
        ),
      );
    },
  };
}

/** Avatars mid-stride, to check joints and garments in motion. */
export function walkSet(): LabSet {
  const rigs: Rig[] = LOOKS.slice(0, 6).map((l) => buildRig({ ...DEFAULT_LOOK, ...l }));
  return {
    items: rigs.map((rig, i) => ({ obj: rig.root, label: `walk ${i}`, width: 1.1 })),
    tick: (dt, time) => {
      rigs.forEach((rig, i) =>
        poseRig(rig, { phase: time * 6 + i, speed: 2 + i * 0.8, emote: 0, emoteT: 0, seat: 0, time }, dt),
      );
    },
  };
}

function modelObject(m: Model, tint?: string): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.InstancedMesh(m.body, vertexMat, 1);
  body.setMatrixAt(0, new THREE.Matrix4());
  body.setColorAt(0, new THREE.Color(tint ?? "#ffffff"));
  body.castShadow = true;
  g.add(body);
  if (m.glass) {
    const glass = new THREE.Mesh(m.glass, glassMaterial);
    glass.renderOrder = 2;
    g.add(glass);
  }
  return g;
}

export function vehicleSet(): LabSet {
  const cfg = CITIES.novapura;
  const ggn = CITIES.udyogabad;
  return {
    items: [
      { obj: createVehicle(2, cfg, "#b3261e").root, label: "scooter", width: 1.6 },
      { obj: createVehicle(1, cfg, "#fff").root, label: "auto", width: 2.4 },
      { obj: createVehicle(1, ggn, "#fff").root, label: "auto (GGN)", width: 2.4 },
      { obj: createVehicle(3, cfg, "#fff").root, label: "cab", width: 2.8 },
    ],
  };
}

export function trafficSet(): LabSet {
  const cfg = CITIES.novapura;
  const o = { occupied: true };
  return {
    items: [
      { obj: modelObject(buildBike(o), "#1d4e89"), label: "bike", width: 1.6 },
      { obj: modelObject(buildAuto(cfg.livery.auto, o)), label: "auto", width: 2.4 },
      { obj: modelObject(buildCar(null, o), "#b3261e"), label: "car", width: 2.8 },
      { obj: modelObject(buildCar(null, o), "#f4f4f4"), label: "car", width: 2.8 },
      { obj: modelObject(buildTruck(o), "#2a6aa3"), label: "truck", width: 3.6 },
      { obj: modelObject(buildBus(o), cfg.metro.color), label: "bus", width: 3.8 },
    ],
  };
}
