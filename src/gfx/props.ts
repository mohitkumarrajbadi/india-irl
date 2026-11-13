import * as THREE from "three";
import { GeoBuilder } from "./geo";

const CHROME = "#9aa1a8";
const DARK = "#23262b";

/** Pole with a cantilever arm toward local +Z. The lamp head is a separate emissive mesh. */
export function lampPost(): { post: THREE.BufferGeometry; head: THREE.BufferGeometry } {
  const g = new GeoBuilder();
  g.cyl(0.07, 0.11, 7.2, "#4a4f57", { pos: [0, 3.6, 0] }, 8);
  g.box(0.14, 0.14, 1.9, "#4a4f57", { pos: [0, 7.15, 0.85] });
  g.box(0.3, 0.3, 0.3, "#4a4f57", { pos: [0, 0.15, 0] });
  const h = new GeoBuilder();
  h.box(0.34, 0.1, 0.8, "#ffffff", { pos: [0, 7.02, 1.7] });
  return { post: g.build(), head: h.build() };
}

/** Bus shelter. Open side faces local +Z (the road). */
export function busStop(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(3.4, 0.12, 1.6, "#2a6a8a", { pos: [0, 2.5, 0] });
  g.box(3.2, 2.3, 0.08, "#9fc4d6", { pos: [0, 1.3, -0.7] });
  g.box(0.08, 2.4, 0.08, DARK, { pos: [-1.6, 1.2, 0.7] });
  g.box(0.08, 2.4, 0.08, DARK, { pos: [1.6, 1.2, 0.7] });
  g.box(0.08, 2.4, 0.08, DARK, { pos: [-1.6, 1.2, -0.7] });
  g.box(0.08, 2.4, 0.08, DARK, { pos: [1.6, 1.2, -0.7] });
  g.box(2.8, 0.08, 0.5, "#7b5a3a", { pos: [0, 0.55, -0.45] });
  g.box(0.5, 1.4, 0.08, "#e2b64a", { pos: [1.9, 1.2, 0.2] });
  g.box(0.1, 2.6, 0.1, CHROME, { pos: [1.9, 1.3, 0.2] });
  return g.build();
}

/** Chai tapri: counter, kettle, umbrella, stools. White vertex parts take the instance tint. */
export function chaiStall(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(2.0, 0.9, 0.9, "#8a5a34", { pos: [0, 0.45, 0] });
  g.box(2.1, 0.06, 1.0, "#d9c9a8", { pos: [0, 0.93, 0] });
  g.box(2.05, 0.08, 0.08, "#6a4028", { pos: [0, 0.88, 0.46] });
  g.cyl(0.14, 0.18, 0.28, "#b8bcc2", { pos: [-0.5, 1.12, 0] }, 10);
  g.cyl(0.05, 0.05, 0.12, "#8a8a8a", { pos: [-0.5, 1.3, 0] }, 6);
  g.cyl(0.22, 0.26, 0.2, "#3a3a3a", { pos: [0.15, 1.05, 0.1] }, 10);
  for (let i = 0; i < 4; i += 1) g.cyl(0.04, 0.04, 0.12, "#f4f0e6", { pos: [0.5 + i * 0.13, 0.99, 0.2] }, 6);
  g.cyl(0.04, 0.04, 2.2, CHROME, { pos: [0.7, 1.1, -0.35] }, 6);
  g.add(new THREE.ConeGeometry(1.7, 0.55, 12), "#ffffff", { pos: [0.7, 2.28, -0.35] });
  // plastic stools
  for (const [x, z] of [
    [-1.5, 0.35],
    [-1.5, -0.35],
    [1.55, 0.35],
  ] as const) {
    g.cyl(0.18, 0.2, 0.06, "#c1121f", { pos: [x, 0.42, z] }, 8);
    g.cyl(0.04, 0.05, 0.4, "#8a2020", { pos: [x, 0.2, z] }, 5);
  }
  g.box(0.35, 0.35, 0.35, "#5a3a22", { pos: [-0.9, 0.18, -0.55] });
  return g.build();
}

/** Indian desi cow. White vertex parts take the instance tint (white, tan, or dark). */
export function cow(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  // rounded body
  g.sphere(0.55, hide, { pos: [0, 1.05, 0], scale: [0.85, 0.75, 1.55] }, 12);
  g.sphere(0.42, hide, { pos: [0, 1.05, 0.55], scale: [0.9, 0.85, 1] }, 10);
  g.sphere(0.38, hide, { pos: [0, 1.02, -0.65], scale: [0.85, 0.8, 1] }, 10);
  // hump (zebu)
  g.sphere(0.28, hide, { pos: [0, 1.48, 0.35], scale: [0.85, 1.0, 1.15] }, 8);
  // neck + head
  g.box(0.32, 0.32, 0.55, hide, { pos: [0, 1.18, 1.05], rot: [0.45, 0, 0] });
  g.sphere(0.26, hide, { pos: [0, 1.22, 1.35], scale: [0.95, 0.9, 1.1] }, 10);
  g.box(0.28, 0.26, 0.32, "#d9b8a0", { pos: [0, 0.98, 1.58] });
  g.box(0.08, 0.05, 0.12, "#1a1a1a", { pos: [0.09, 1.12, 1.55] });
  g.box(0.08, 0.05, 0.12, "#1a1a1a", { pos: [-0.09, 1.12, 1.55] });
  // curved horns
  g.add(new THREE.ConeGeometry(0.045, 0.32, 6), "#e8e0cc", { pos: [0.18, 1.48, 1.28], rot: [0.15, 0, -1.05] });
  g.add(new THREE.ConeGeometry(0.045, 0.32, 6), "#e8e0cc", { pos: [-0.18, 1.48, 1.28], rot: [0.15, 0, 1.05] });
  // dewlap hint
  g.box(0.12, 0.28, 0.08, "#e0d0c0", { pos: [0, 0.85, 1.25] });
  // legs with joints
  for (const x of [-0.24, 0.24]) {
    for (const z of [-0.55, 0.55]) {
      g.cyl(0.07, 0.09, 0.55, hide, { pos: [x, 0.45, z] }, 6);
      g.box(0.1, 0.08, 0.14, "#3a2a20", { pos: [x, 0.1, z + 0.02] });
    }
  }
  // ears + tail
  g.box(0.08, 0.14, 0.04, hide, { pos: [0.28, 1.28, 1.25], rot: [0, 0, 0.5] });
  g.box(0.08, 0.14, 0.04, hide, { pos: [-0.28, 1.28, 1.25], rot: [0, 0, -0.5] });
  g.cyl(0.03, 0.04, 0.7, "#2a2a2a", { pos: [0, 1.05, -1.05], rot: [0.35, 0, 0] }, 5);
  g.sphere(0.06, "#3a2a20", { pos: [0, 0.78, -1.35] }, 6);
  return g.build();
}

/** Indian street dog (indie). White parts take instance tint. */
export function streetDog(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  g.sphere(0.28, hide, { pos: [0, 0.55, 0], scale: [0.7, 0.65, 1.35] }, 10);
  g.sphere(0.18, hide, { pos: [0, 0.62, 0.42], scale: [0.95, 0.9, 1.05] }, 8);
  g.box(0.16, 0.14, 0.22, hide, { pos: [0, 0.58, 0.58], rot: [0.2, 0, 0] });
  g.box(0.12, 0.1, 0.14, "#3a2a22", { pos: [0, 0.48, 0.72] });
  // upright ears
  g.add(new THREE.ConeGeometry(0.05, 0.14, 5), hide, { pos: [0.08, 0.78, 0.48], rot: [0.2, 0, 0.15] });
  g.add(new THREE.ConeGeometry(0.05, 0.14, 5), hide, { pos: [-0.08, 0.78, 0.48], rot: [0.2, 0, -0.15] });
  for (const x of [-0.12, 0.12]) {
    for (const z of [-0.28, 0.22]) g.cyl(0.035, 0.04, 0.32, hide, { pos: [x, 0.22, z] }, 5);
  }
  g.cyl(0.025, 0.03, 0.35, hide, { pos: [0, 0.55, -0.42], rot: [0.6, 0.3, 0] }, 5);
  return g.build();
}

/** Market goat — common near old-city lanes. */
export function goat(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  g.sphere(0.32, hide, { pos: [0, 0.7, 0], scale: [0.65, 0.7, 1.2] }, 10);
  g.box(0.2, 0.22, 0.35, hide, { pos: [0, 0.85, 0.45], rot: [0.35, 0, 0] });
  g.sphere(0.16, hide, { pos: [0, 0.95, 0.65] }, 8);
  g.box(0.1, 0.08, 0.12, "#d9b8a0", { pos: [0, 0.85, 0.78] });
  g.add(new THREE.ConeGeometry(0.03, 0.22, 5), "#e8e0cc", { pos: [0.08, 1.12, 0.58], rot: [-0.4, 0, -0.3] });
  g.add(new THREE.ConeGeometry(0.03, 0.22, 5), "#e8e0cc", { pos: [-0.08, 1.12, 0.58], rot: [-0.4, 0, 0.3] });
  g.box(0.06, 0.1, 0.04, hide, { pos: [0.14, 0.98, 0.55], rot: [0, 0, 0.6] });
  g.box(0.06, 0.1, 0.04, hide, { pos: [-0.14, 0.98, 0.55], rot: [0, 0, -0.6] });
  for (const x of [-0.12, 0.12]) {
    for (const z of [-0.28, 0.22]) g.cyl(0.03, 0.035, 0.45, hide, { pos: [x, 0.28, z] }, 5);
  }
  g.box(0.04, 0.25, 0.04, "#3a2a20", { pos: [0, 0.7, -0.42], rot: [0.4, 0, 0] });
  return g.build();
}

/** Metro viaduct pillar with a crossbeam along local X. Origin at ground. */
export function metroPillar(height: number): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.cyl(0.62, 0.85, height, "#b7b3aa", { pos: [0, height / 2, 0] }, 10);
  g.box(6.2, 1.1, 1.8, "#a9a59c", { pos: [0, height + 0.1, 0] });
  g.box(1.8, 0.4, 1.8, "#8e8a82", { pos: [0, 0.2, 0] });
  return g.build();
}

/** Viaduct deck along local Z, centered at the origin. */
export function metroDeck(length: number, color: string): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(5.4, 0.9, length, "#b2aea5", { pos: [0, 0, 0] });
  g.box(0.25, 1.2, length, "#9a968d", { pos: [2.55, 0.9, 0] });
  g.box(0.25, 1.2, length, "#9a968d", { pos: [-2.55, 0.9, 0] });
  g.box(0.08, 0.08, length, "#2a2a2a", { pos: [0.72, 0.5, 0] });
  g.box(0.08, 0.08, length, "#2a2a2a", { pos: [-0.72, 0.5, 0] });
  g.box(5.0, 0.06, length, color, { pos: [0, -0.48, 0] });
  return g.build();
}

/** Platform + canopy straddling the viaduct, along local Z. */
export function metroStation(color: string): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(8.8, 0.6, 44, "#c5c1b8", { pos: [0, 0.15, 0] });
  g.box(8.4, 0.25, 46, color, { pos: [0, 5.2, 0] });
  g.box(7.8, 0.35, 44, "#e8e4d8", { pos: [0, 5.45, 0] });
  for (let i = -5; i <= 5; i += 1) {
    g.box(0.18, 5, 0.18, "#8a8a8a", { pos: [-3.9, 2.8, i * 4] });
    g.box(0.18, 5, 0.18, "#8a8a8a", { pos: [3.9, 2.8, i * 4] });
  }
  g.box(8.5, 1.6, 0.3, "#ffffff", { pos: [0, 4.4, 22.4] });
  g.box(8.5, 1.6, 0.3, "#ffffff", { pos: [0, 4.4, -22.4] });
  g.box(7.8, 1, 0.34, color, { pos: [0, 4.4, 22.5] });
  g.box(7.8, 1, 0.34, color, { pos: [0, 4.4, -22.5] });
  return g.build();
}

export function metroCoach(color: string): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(2.9, 3.0, 17.4, "#f1efe8", { pos: [0, 1.7, 0] });
  g.box(2.94, 0.5, 17.44, color, { pos: [0, 0.55, 0] });
  g.box(2.96, 0.9, 16.4, "#16202c", { pos: [0, 2.2, 0] });
  g.box(2.5, 0.2, 17, "#cfcbc0", { pos: [0, 3.3, 0] });
  g.box(0.6, 0.2, 0.05, "#fff3bd", { pos: [0.8, 0.9, 8.74] });
  g.box(0.6, 0.2, 0.05, "#fff3bd", { pos: [-0.8, 0.9, 8.74] });
  return g.build();
}

/** Roadside fruit / vegetable cart — common on every Indian IT-city market street. */
export function fruitCart(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(1.6, 0.12, 0.9, "#6b4423", { pos: [0, 0.72, 0] });
  g.box(0.08, 0.72, 0.08, "#5a3a1e", { pos: [-0.7, 0.36, 0.35] });
  g.box(0.08, 0.72, 0.08, "#5a3a1e", { pos: [0.7, 0.36, 0.35] });
  g.box(0.08, 0.72, 0.08, "#5a3a1e", { pos: [-0.7, 0.36, -0.35] });
  g.box(0.08, 0.72, 0.08, "#5a3a1e", { pos: [0.7, 0.36, -0.35] });
  g.cyl(0.12, 0.12, 0.08, "#2a2a2a", { pos: [-0.55, 0.12, 0.4], rot: [Math.PI / 2, 0, 0] }, 8);
  g.cyl(0.12, 0.12, 0.08, "#2a2a2a", { pos: [0.55, 0.12, 0.4], rot: [Math.PI / 2, 0, 0] }, 8);
  const piles: [number, string][] = [
    [-0.45, "#e8913c"],
    [-0.15, "#d4a017"],
    [0.15, "#c3412f"],
    [0.45, "#6b9a42"],
  ];
  for (const [x, col] of piles) {
    g.sphere(0.18, col, { pos: [x, 0.92, 0], scale: [1.2, 0.7, 1] }, 8);
    g.sphere(0.12, col, { pos: [x + 0.08, 0.98, 0.12] }, 6);
  }
  g.box(1.5, 0.04, 0.04, "#8a5a34", { pos: [0, 1.05, -0.4] });
  return g.build();
}

/** Marigold / flower seller cart — Pune FC Road, Hyd Old City, temple streets. */
export function flowerCart(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(1.3, 0.55, 0.7, "#7a4a28", { pos: [0, 0.4, 0] });
  g.box(1.35, 0.05, 0.75, "#d9c9a8", { pos: [0, 0.7, 0] });
  const blooms = ["#e8913c", "#f2c230", "#d9548a", "#c1121f", "#f2822e"];
  for (let i = 0; i < 5; i += 1) {
    g.sphere(0.12, blooms[i], { pos: [-0.45 + i * 0.22, 0.88, 0.05] }, 8);
    g.sphere(0.08, blooms[(i + 2) % 5], { pos: [-0.4 + i * 0.2, 0.95, -0.15] }, 6);
  }
  g.box(0.9, 0.35, 0.02, "#f4f0e6", { pos: [0, 0.45, 0.36] });
  return g.build();
}

/** Tiny roadside shrine with flags — every Indian street corner. */
export function roadsideShrine(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(0.9, 0.15, 0.7, "#b7a98f", { pos: [0, 0.08, 0] });
  g.box(0.7, 0.85, 0.55, "#e6d8bd", { pos: [0, 0.55, 0] });
  g.box(0.78, 0.12, 0.62, "#c9a06a", { pos: [0, 1.02, 0] });
  g.add(new THREE.ConeGeometry(0.42, 0.35, 4), "#c1121f", { pos: [0, 1.25, 0], rot: [0, Math.PI / 4, 0] });
  g.box(0.2, 0.28, 0.12, "#e2b64a", { pos: [0, 0.55, 0.22] });
  g.sphere(0.04, "#f2c230", { pos: [0, 0.72, 0.28] }, 6);
  for (const x of [-0.45, 0.45]) {
    g.box(0.04, 1.4, 0.04, "#8a2be2", { pos: [x, 0.7, -0.2] });
    g.box(0.2, 0.12, 0.02, "#f2c230", { pos: [x, 1.35, -0.2] });
  }
  return g.build();
}

/** Tower crane — Gurugram / Hyd skyline construction. */
export function crane(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(0.35, 28, 0.35, "#f2c230", { pos: [0, 14, 0] });
  g.box(18, 0.3, 0.3, "#f2c230", { pos: [5, 27.5, 0] });
  g.box(4, 0.25, 0.25, "#f2c230", { pos: [-2.5, 27.5, 0] });
  g.box(1.2, 1.4, 1.2, "#e8913c", { pos: [0, 26.4, 0] });
  g.box(2.4, 0.5, 2.4, "#4a4f57", { pos: [0, 0.25, 0] });
  g.box(0.08, 6, 0.08, "#2a2a2a", { pos: [10, 24.5, 0] });
  g.box(0.6, 0.4, 0.6, "#c1121f", { pos: [10, 21.4, 0] });
  return g.build();
}

/** Newspaper / chai-with-paper stand. */
export function newsStand(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(1.4, 1.1, 0.7, "#3a6a8a", { pos: [0, 0.55, 0] });
  g.box(1.5, 0.08, 0.8, "#2a4a5a", { pos: [0, 1.15, 0] });
  g.box(1.2, 0.55, 0.04, "#f4f0e6", { pos: [0, 0.7, 0.36] });
  g.box(0.35, 0.45, 0.08, "#c1121f", { pos: [-0.35, 0.65, 0.4] });
  g.box(0.35, 0.45, 0.08, "#1d4e89", { pos: [0.05, 0.65, 0.4] });
  g.box(0.35, 0.45, 0.08, "#1f7a3a", { pos: [0.4, 0.65, 0.4] });
  g.box(0.5, 0.2, 0.3, "#8a5a34", { pos: [0.4, 1.25, 0] });
  return g.build();
}

/** Blue municipal water tanker parked at the kerb. */
export function waterTanker(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(1.6, 0.55, 3.4, "#2a6a9a", { pos: [0, 1.1, 0] });
  g.cyl(0.85, 0.85, 2.8, "#3a8ab8", { pos: [0, 1.55, -0.1], rot: [Math.PI / 2, 0, 0] }, 12);
  g.box(1.5, 1.1, 1.1, "#2a6a9a", { pos: [0, 1.0, 1.5] });
  g.box(0.35, 0.2, 0.08, "#f2c230", { pos: [0.4, 1.15, 2.05] });
  g.box(0.35, 0.2, 0.08, "#f2c230", { pos: [-0.4, 1.15, 2.05] });
  for (const z of [-1.1, 1.0]) {
    g.cyl(0.28, 0.28, 0.22, "#1a1a1a", { pos: [0.75, 0.28, z], rot: [0, 0, Math.PI / 2] }, 8);
    g.cyl(0.28, 0.28, 0.22, "#1a1a1a", { pos: [-0.75, 0.28, z], rot: [0, 0, Math.PI / 2] }, 8);
  }
  return g.build();
}

/** Traffic signal pole — arm faces local +Z (road). */
export function trafficSignal(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.cyl(0.08, 0.1, 5.4, "#3a3f46", { pos: [0, 2.7, 0] }, 8);
  g.box(0.22, 0.22, 0.22, "#2a2e34", { pos: [0, 0.12, 0] });
  g.box(0.14, 0.14, 2.4, "#3a3f46", { pos: [0, 5.35, 1.1] });
  g.box(0.42, 1.15, 0.28, "#1a1c20", { pos: [0, 5.2, 2.2] });
  g.sphere(0.12, "#c1121f", { pos: [0, 5.48, 2.32] }, 8);
  g.sphere(0.12, "#f2c230", { pos: [0, 5.2, 2.32] }, 8);
  g.sphere(0.12, "#2a9d4a", { pos: [0, 4.92, 2.32] }, 8);
  return g.build();
}

/** Painted asphalt speed breaker hump along local X. */
export function speedBreaker(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(3.6, 0.14, 0.85, "#2a2a2a", { pos: [0, 0.07, 0] });
  g.box(3.6, 0.04, 0.22, "#f2c230", { pos: [0, 0.15, -0.22] });
  g.box(3.6, 0.04, 0.22, "#f2c230", { pos: [0, 0.15, 0.22] });
  g.box(0.35, 0.18, 0.12, "#e8e8e8", { pos: [-1.2, 0.2, 0] });
  g.box(0.35, 0.18, 0.12, "#e8e8e8", { pos: [0, 0.2, 0] });
  g.box(0.35, 0.18, 0.12, "#e8e8e8", { pos: [1.2, 0.2, 0] });
  return g.build();
}

/** Auto-rickshaw stand bay marker + tiny shelter. */
export function autoStand(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(4.2, 0.04, 2.2, "#3a6a4a", { pos: [0, 0.02, 0] });
  g.box(0.08, 2.4, 0.08, CHROME, { pos: [-1.8, 1.2, -0.9] });
  g.box(0.08, 2.4, 0.08, CHROME, { pos: [1.8, 1.2, -0.9] });
  g.box(3.8, 0.08, 1.2, "#e2b64a", { pos: [0, 2.45, -0.9] });
  g.box(1.2, 0.55, 0.06, "#1a5c8a", { pos: [0, 1.6, -0.95] });
  return g.build();
}

export function glowDisc(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const grd = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,214,140,1)");
  grd.addColorStop(0.35, "rgba(255,190,110,0.45)");
  grd.addColorStop(1, "rgba(255,170,90,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
