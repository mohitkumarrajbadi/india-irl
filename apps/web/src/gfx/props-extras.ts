import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { CHROME, matte } from "./surface";

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
