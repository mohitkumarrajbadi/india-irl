import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { CHROME, matte } from "./surface";

const DARK = matte("#23262b");

/** Pole with a cantilever arm toward local +Z. The lamp head is a separate emissive mesh. */
export function lampPost(): { post: THREE.BufferGeometry; head: THREE.BufferGeometry } {
  const g = new GeoBuilder();
  g.cyl(0.07, 0.11, 7.2, matte("#4a4f57", 0.7), { pos: [0, 3.6, 0] }, 10);
  g.roundBox(0.14, 0.14, 1.9, matte("#4a4f57", 0.7), { pos: [0, 7.15, 0.85] }, 0.04, 2);
  g.sphere(0.18, matte("#4a4f57", 0.7), { pos: [0, 0.15, 0] }, 10);
  const h = new GeoBuilder();
  h.roundBox(0.34, 0.1, 0.8, "#ffffff", { pos: [0, 7.02, 1.7] }, 0.04, 2);
  return { post: g.build(), head: h.build() };
}

/** Bus shelter. Open side faces local +Z (the road). */
export function busStop(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(3.4, 0.12, 1.6, "#2a6a8a", { pos: [0, 2.5, 0] }, 0.04, 2);
  g.roundBox(3.2, 2.3, 0.08, { color: "#9fc4d6", rough: 0.2, metal: 0.1 }, { pos: [0, 1.3, -0.7] }, 0.03, 2);
  for (const x of [-1.6, 1.6] as const) {
    for (const z of [0.7, -0.7] as const) {
      g.cyl(0.05, 0.05, 2.4, DARK, { pos: [x, 1.2, z] }, 8);
    }
  }
  g.roundBox(2.8, 0.08, 0.5, "#7b5a3a", { pos: [0, 0.55, -0.45] }, 0.03, 2);
  g.roundBox(0.5, 1.4, 0.08, "#e2b64a", { pos: [1.9, 1.2, 0.2] }, 0.04, 2);
  g.cyl(0.06, 0.06, 2.6, CHROME, { pos: [1.9, 1.3, 0.2] }, 8);
  return g.build();
}

/** Chai tapri: counter, kettle, umbrella, stools. White vertex parts take the instance tint. */
export function chaiStall(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(2.0, 0.9, 0.9, "#8a5a34", { pos: [0, 0.45, 0] }, 0.08, 3);
  g.roundBox(2.1, 0.06, 1.0, "#d9c9a8", { pos: [0, 0.93, 0] }, 0.03, 2);
  g.roundBox(2.05, 0.08, 0.08, "#6a4028", { pos: [0, 0.88, 0.46] }, 0.02, 2);
  g.cyl(0.14, 0.18, 0.28, CHROME, { pos: [-0.5, 1.12, 0] }, 12);
  g.cyl(0.05, 0.05, 0.12, matte("#8a8a8a"), { pos: [-0.5, 1.3, 0] }, 8);
  g.cyl(0.22, 0.26, 0.2, matte("#3a3a3a"), { pos: [0.15, 1.05, 0.1] }, 12);
  for (let i = 0; i < 4; i += 1) g.cyl(0.04, 0.04, 0.12, "#f4f0e6", { pos: [0.5 + i * 0.13, 0.99, 0.2] }, 8);
  g.cyl(0.04, 0.04, 2.2, CHROME, { pos: [0.7, 1.1, -0.35] }, 8);
  g.add(new THREE.ConeGeometry(1.7, 0.55, 16), "#ffffff", { pos: [0.7, 2.28, -0.35] });
  for (const [x, z] of [
    [-1.5, 0.35],
    [-1.5, -0.35],
    [1.55, 0.35],
  ] as const) {
    g.cyl(0.18, 0.2, 0.06, "#c1121f", { pos: [x, 0.42, z] }, 10);
    g.cyl(0.04, 0.05, 0.4, "#8a2020", { pos: [x, 0.2, z] }, 6);
  }
  g.sphere(0.22, "#5a3a22", { pos: [-0.9, 0.18, -0.55] }, 10);
  return g.build();
}

/** Indian desi cow — soft clay Memoji animal. */
export function cow(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const hide = "#ffffff";
  g.sphere(0.55, hide, { pos: [0, 1.05, 0], scale: [0.85, 0.75, 1.55] }, 14);
  g.sphere(0.42, hide, { pos: [0, 1.05, 0.55], scale: [0.9, 0.85, 1] }, 12);
  g.sphere(0.38, hide, { pos: [0, 1.02, -0.65], scale: [0.85, 0.8, 1] }, 12);
  g.sphere(0.28, hide, { pos: [0, 1.48, 0.35], scale: [0.85, 1.0, 1.15] }, 10);
  // Soft neck + head (no boxes)
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
  g.roundBox(2.9, 3.0, 17.4, "#f1efe8", { pos: [0, 1.7, 0] }, 0.18, 4);
  g.roundBox(2.94, 0.5, 17.44, color, { pos: [0, 0.55, 0] }, 0.08, 3);
  g.roundBox(2.96, 0.9, 16.4, { color: "#16202c", rough: 0.18, metal: 0.15 }, { pos: [0, 2.2, 0] }, 0.1, 3);
  g.roundBox(2.5, 0.2, 17, "#cfcbc0", { pos: [0, 3.3, 0] }, 0.05, 2);
  g.sphere(0.14, "#fff3bd", { pos: [0.8, 0.9, 8.74], scale: [1.8, 1, 0.4] }, 8);
  g.sphere(0.14, "#fff3bd", { pos: [-0.8, 0.9, 8.74], scale: [1.8, 1, 0.4] }, 8);
  return g.build();
}

/** Roadside fruit / vegetable cart — common on every Indian IT-city market street. */
export function fruitCart(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(1.6, 0.12, 0.9, "#6b4423", { pos: [0, 0.72, 0] }, 0.04, 2);
  for (const x of [-0.7, 0.7] as const) {
    for (const z of [0.35, -0.35] as const) {
      g.cyl(0.045, 0.045, 0.72, "#5a3a1e", { pos: [x, 0.36, z] }, 6);
    }
  }
  g.cyl(0.12, 0.12, 0.08, matte("#2a2a2a"), { pos: [-0.55, 0.12, 0.4], rot: [Math.PI / 2, 0, 0] }, 10);
  g.cyl(0.12, 0.12, 0.08, matte("#2a2a2a"), { pos: [0.55, 0.12, 0.4], rot: [Math.PI / 2, 0, 0] }, 10);
  const piles: [number, string][] = [
    [-0.45, "#e8913c"],
    [-0.15, "#d4a017"],
    [0.15, "#c3412f"],
    [0.45, "#6b9a42"],
  ];
  for (const [x, col] of piles) {
    g.sphere(0.18, col, { pos: [x, 0.92, 0], scale: [1.2, 0.7, 1] }, 10);
    g.sphere(0.12, col, { pos: [x + 0.08, 0.98, 0.12] }, 8);
  }
  g.roundBox(1.5, 0.04, 0.04, "#8a5a34", { pos: [0, 1.05, -0.4] }, 0.015, 2);
  return g.build();
}

/** Marigold / flower seller cart — Pune FC Road, Hyd Old City, temple streets. */
export function flowerCart(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(1.3, 0.55, 0.7, "#7a4a28", { pos: [0, 0.4, 0] }, 0.08, 3);
  g.roundBox(1.35, 0.05, 0.75, "#d9c9a8", { pos: [0, 0.7, 0] }, 0.02, 2);
  const blooms = ["#e8913c", "#f2c230", "#d9548a", "#c1121f", "#f2822e"];
  for (let i = 0; i < 5; i += 1) {
    g.sphere(0.12, blooms[i], { pos: [-0.45 + i * 0.22, 0.88, 0.05] }, 10);
    g.sphere(0.08, blooms[(i + 2) % 5], { pos: [-0.4 + i * 0.2, 0.95, -0.15] }, 8);
  }
  g.roundBox(0.9, 0.35, 0.02, "#f4f0e6", { pos: [0, 0.45, 0.36] }, 0.02, 2);
  return g.build();
}

/** Tiny roadside shrine with flags — every Indian street corner. */
export function roadsideShrine(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(0.9, 0.15, 0.7, "#b7a98f", { pos: [0, 0.08, 0] }, 0.04, 2);
  g.roundBox(0.7, 0.85, 0.55, "#e6d8bd", { pos: [0, 0.55, 0] }, 0.06, 3);
  g.roundBox(0.78, 0.12, 0.62, "#c9a06a", { pos: [0, 1.02, 0] }, 0.04, 2);
  g.add(new THREE.ConeGeometry(0.42, 0.35, 4), "#c1121f", { pos: [0, 1.25, 0], rot: [0, Math.PI / 4, 0] });
  g.roundBox(0.2, 0.28, 0.12, "#e2b64a", { pos: [0, 0.55, 0.22] }, 0.03, 2);
  g.sphere(0.04, "#f2c230", { pos: [0, 0.72, 0.28] }, 8);
  for (const x of [-0.45, 0.45]) {
    g.cyl(0.025, 0.025, 1.4, "#8a2be2", { pos: [x, 0.7, -0.2] }, 6);
    g.roundBox(0.2, 0.12, 0.02, "#f2c230", { pos: [x, 1.35, -0.2] }, 0.02, 2);
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
  g.roundBox(1.4, 1.1, 0.7, "#3a6a8a", { pos: [0, 0.55, 0] }, 0.08, 3);
  g.roundBox(1.5, 0.08, 0.8, "#2a4a5a", { pos: [0, 1.15, 0] }, 0.03, 2);
  g.roundBox(1.2, 0.55, 0.04, "#f4f0e6", { pos: [0, 0.7, 0.36] }, 0.02, 2);
  g.roundBox(0.35, 0.45, 0.08, "#c1121f", { pos: [-0.35, 0.65, 0.4] }, 0.02, 2);
  g.roundBox(0.35, 0.45, 0.08, "#1d4e89", { pos: [0.05, 0.65, 0.4] }, 0.02, 2);
  g.roundBox(0.35, 0.45, 0.08, "#1f7a3a", { pos: [0.4, 0.65, 0.4] }, 0.02, 2);
  g.roundBox(0.5, 0.2, 0.3, "#8a5a34", { pos: [0.4, 1.25, 0] }, 0.04, 2);
  return g.build();
}

/** Blue municipal water tanker parked at the kerb. */
export function waterTanker(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(1.6, 0.55, 3.4, "#2a6a9a", { pos: [0, 1.1, 0] }, 0.1, 3);
  g.cyl(0.85, 0.85, 2.8, "#3a8ab8", { pos: [0, 1.55, -0.1], rot: [Math.PI / 2, 0, 0] }, 16);
  g.roundBox(1.5, 1.1, 1.1, "#2a6a9a", { pos: [0, 1.0, 1.5] }, 0.1, 3);
  g.sphere(0.12, "#f2c230", { pos: [0.4, 1.15, 2.05], scale: [1.4, 0.9, 0.5] }, 8);
  g.sphere(0.12, "#f2c230", { pos: [-0.4, 1.15, 2.05], scale: [1.4, 0.9, 0.5] }, 8);
  for (const z of [-1.1, 1.0]) {
    g.cyl(0.28, 0.28, 0.22, matte("#1a1a1a"), { pos: [0.75, 0.28, z], rot: [0, 0, Math.PI / 2] }, 12);
    g.cyl(0.28, 0.28, 0.22, matte("#1a1a1a"), { pos: [-0.75, 0.28, z], rot: [0, 0, Math.PI / 2] }, 12);
  }
  return g.build();
}

/** Traffic signal pole — arm faces local +Z (road). */
export function trafficSignal(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.cyl(0.08, 0.1, 5.4, matte("#3a3f46"), { pos: [0, 2.7, 0] }, 10);
  g.sphere(0.14, matte("#2a2e34"), { pos: [0, 0.12, 0] }, 8);
  g.roundBox(0.14, 0.14, 2.4, matte("#3a3f46"), { pos: [0, 5.35, 1.1] }, 0.04, 2);
  g.roundBox(0.42, 1.15, 0.28, matte("#1a1c20"), { pos: [0, 5.2, 2.2] }, 0.06, 3);
  g.sphere(0.12, "#c1121f", { pos: [0, 5.48, 2.32] }, 10);
  g.sphere(0.12, "#f2c230", { pos: [0, 5.2, 2.32] }, 10);
  g.sphere(0.12, "#2a9d4a", { pos: [0, 4.92, 2.32] }, 10);
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
  g.roundBox(4.2, 0.04, 2.2, "#3a6a4a", { pos: [0, 0.02, 0] }, 0.02, 2);
  g.cyl(0.05, 0.05, 2.4, CHROME, { pos: [-1.8, 1.2, -0.9] }, 8);
  g.cyl(0.05, 0.05, 2.4, CHROME, { pos: [1.8, 1.2, -0.9] }, 8);
  g.roundBox(3.8, 0.08, 1.2, "#e2b64a", { pos: [0, 2.45, -0.9] }, 0.03, 2);
  g.roundBox(1.2, 0.55, 0.06, "#1a5c8a", { pos: [0, 1.6, -0.95] }, 0.03, 2);
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
