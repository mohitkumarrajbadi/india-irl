import * as THREE from "three";
import { GeoBuilder } from "./geo";

/**
 * Indian street / park trees as two instanced meshes (trunk + crown).
 * Crown uses overlapping soft blobs so foliage reads natural at distance.
 */
export function treeTrunk(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  // tapered trunk
  g.cyl(0.09, 0.16, 3.6, "#6a4a32", { pos: [0, 1.8, 0] }, 8);
  g.cyl(0.12, 0.18, 0.35, "#5a3a28", { pos: [0, 0.15, 0] }, 8);
  // short branch stubs for silhouette
  g.cyl(0.04, 0.05, 0.55, "#6a4a32", { pos: [0.28, 3.1, 0.05], rot: [0, 0, 1.05] }, 6);
  g.cyl(0.035, 0.045, 0.45, "#6a4a32", { pos: [-0.22, 2.85, -0.08], rot: [0.2, 0, -1.0] }, 6);
  return g.build();
}

/** Multi-blob canopy — tinted per instance via instanceColor. */
export function treeCrown(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const leaf = "#ffffff";
  // layered canopy (rain tree / gulmohar silhouette)
  g.sphere(1.05, leaf, { pos: [0, 0, 0], scale: [1.15, 0.85, 1.1] }, 10);
  g.sphere(0.72, leaf, { pos: [0.55, 0.15, 0.25], scale: [1, 0.9, 1] }, 8);
  g.sphere(0.68, leaf, { pos: [-0.5, 0.1, -0.2], scale: [1, 0.85, 1] }, 8);
  g.sphere(0.55, leaf, { pos: [0.15, 0.45, -0.45], scale: [1.05, 0.8, 1] }, 8);
  g.sphere(0.5, leaf, { pos: [-0.2, 0.35, 0.5], scale: [1, 0.75, 1] }, 8);
  g.sphere(0.42, leaf, { pos: [0.05, 0.7, 0.05], scale: [1.1, 0.7, 1.05] }, 8);
  return g.build();
}

/** Low median / park shrub — flatter multi-blob. */
export function shrubGeo(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const leaf = "#3d7a3c";
  g.sphere(0.48, leaf, { pos: [0, 0.2, 0], scale: [1.2, 0.65, 1.1] }, 8);
  g.sphere(0.32, leaf, { pos: [0.28, 0.22, 0.1], scale: [1, 0.7, 1] }, 6);
  g.sphere(0.3, leaf, { pos: [-0.22, 0.18, -0.12], scale: [1, 0.65, 1] }, 6);
  g.sphere(0.22, "#4a8a42", { pos: [0.05, 0.38, -0.05] }, 6);
  return g.build();
}
