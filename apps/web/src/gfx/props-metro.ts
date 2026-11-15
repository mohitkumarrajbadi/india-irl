import type * as THREE from "three";
import { GeoBuilder } from "./geo";

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
