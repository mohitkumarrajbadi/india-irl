import * as THREE from "three";
import { GeoBuilder } from "./geo";

/** Indian desi cow — soft clay Memoji animal. */
export function cow(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  g.sphere(0.55, hide, { pos: [0, 1.05, 0], scale: [0.85, 0.75, 1.55] }, 14);
  g.sphere(0.42, hide, { pos: [0, 1.05, 0.55], scale: [0.9, 0.85, 1] }, 12);
  g.sphere(0.38, hide, { pos: [0, 1.02, -0.65], scale: [0.85, 0.8, 1] }, 12);
  g.sphere(0.28, hide, { pos: [0, 1.48, 0.35], scale: [0.85, 1.0, 1.15] }, 10);
  g.capsule(0.14, 0.28, hide, { pos: [0, 1.18, 1.05], rot: [0.9, 0, 0] }, 4, 10);
  g.sphere(0.26, hide, { pos: [0, 1.22, 1.35], scale: [0.95, 0.9, 1.1] }, 12);
  g.sphere(0.16, "#d9b8a0", { pos: [0, 0.98, 1.58], scale: [1.1, 0.85, 1.15] }, 10);
  g.sphere(0.04, "#1a1a1a", { pos: [0.09, 1.12, 1.55] }, 6);
  g.sphere(0.04, "#1a1a1a", { pos: [-0.09, 1.12, 1.55] }, 6);
  g.add(new THREE.ConeGeometry(0.045, 0.32, 8), "#e8e0cc", { pos: [0.18, 1.48, 1.28], rot: [0.15, 0, -1.05] });
  g.add(new THREE.ConeGeometry(0.045, 0.32, 8), "#e8e0cc", { pos: [-0.18, 1.48, 1.28], rot: [0.15, 0, 1.05] });
  g.sphere(0.08, "#e0d0c0", { pos: [0, 0.85, 1.25], scale: [0.7, 1.4, 0.6] }, 8);
  for (const x of [-0.24, 0.24]) {
    for (const z of [-0.55, 0.55]) {
      g.capsule(0.07, 0.42, hide, { pos: [x, 0.4, z] }, 4, 8);
      g.sphere(0.07, "#3a2a20", { pos: [x, 0.1, z + 0.02], scale: [1.1, 0.6, 1.3] }, 8);
    }
  }
  g.sphere(0.07, hide, { pos: [0.28, 1.28, 1.25], scale: [0.6, 1.2, 0.5] }, 8);
  g.sphere(0.07, hide, { pos: [-0.28, 1.28, 1.25], scale: [0.6, 1.2, 0.5] }, 8);
  g.capsule(0.03, 0.55, "#2a2a2a", { pos: [0, 1.05, -1.05], rot: [0.35, 0, 0] }, 3, 6);
  g.sphere(0.06, "#3a2a20", { pos: [0, 0.78, -1.35] }, 8);
  return g.build();
}

/** Indian street dog (indie) — soft clay. */
export function streetDog(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  g.sphere(0.28, hide, { pos: [0, 0.55, 0], scale: [0.7, 0.65, 1.35] }, 12);
  g.sphere(0.18, hide, { pos: [0, 0.62, 0.42], scale: [0.95, 0.9, 1.05] }, 10);
  g.sphere(0.12, hide, { pos: [0, 0.58, 0.62], scale: [0.95, 0.85, 1.1] }, 10);
  g.sphere(0.08, "#3a2a22", { pos: [0, 0.48, 0.74], scale: [1, 0.8, 1.2] }, 8);
  g.add(new THREE.ConeGeometry(0.05, 0.14, 6), hide, { pos: [0.08, 0.78, 0.48], rot: [0.2, 0, 0.15] });
  g.add(new THREE.ConeGeometry(0.05, 0.14, 6), hide, { pos: [-0.08, 0.78, 0.48], rot: [0.2, 0, -0.15] });
  for (const x of [-0.12, 0.12]) {
    for (const z of [-0.28, 0.22]) g.capsule(0.035, 0.22, hide, { pos: [x, 0.22, z] }, 3, 6);
  }
  g.capsule(0.025, 0.28, hide, { pos: [0, 0.55, -0.42], rot: [0.6, 0.3, 0] }, 3, 6);
  return g.build();
}

/** Market goat — soft clay. */
export function goat(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  g.sphere(0.32, hide, { pos: [0, 0.7, 0], scale: [0.65, 0.7, 1.2] }, 12);
  g.capsule(0.1, 0.2, hide, { pos: [0, 0.85, 0.45], rot: [0.7, 0, 0] }, 4, 8);
  g.sphere(0.16, hide, { pos: [0, 0.95, 0.65] }, 10);
  g.sphere(0.07, "#d9b8a0", { pos: [0, 0.85, 0.78], scale: [1, 0.8, 1.2] }, 8);
  g.add(new THREE.ConeGeometry(0.03, 0.22, 6), "#e8e0cc", { pos: [0.08, 1.12, 0.58], rot: [-0.4, 0, -0.3] });
  g.add(new THREE.ConeGeometry(0.03, 0.22, 6), "#e8e0cc", { pos: [-0.08, 1.12, 0.58], rot: [-0.4, 0, 0.3] });
  g.sphere(0.05, hide, { pos: [0.14, 0.98, 0.55], scale: [0.7, 1.2, 0.5] }, 6);
  g.sphere(0.05, hide, { pos: [-0.14, 0.98, 0.55], scale: [0.7, 1.2, 0.5] }, 6);
  for (const x of [-0.12, 0.12]) {
    for (const z of [-0.28, 0.22]) g.capsule(0.03, 0.32, hide, { pos: [x, 0.28, z] }, 3, 6);
  }
  g.capsule(0.025, 0.2, "#3a2a20", { pos: [0, 0.7, -0.42], rot: [0.4, 0, 0] }, 3, 6);
  return g.build();
}
