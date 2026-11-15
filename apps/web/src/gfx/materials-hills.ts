import * as THREE from "three";

export function makeHillGeometry(amount: number, seed: number): THREE.BufferGeometry {
  const seg = 160;
  const R = 560;
  const g = new THREE.CylinderGeometry(R, R, 1, seg, 1, true);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const top = pos.getY(i) > 0;
    if (!top) {
      pos.setY(i, -30);
      continue;
    }
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const n =
      Math.sin(a * 3 + seed) * 0.5 +
      Math.sin(a * 7 + seed * 2.1) * 0.3 +
      Math.sin(a * 17 + seed * 0.7) * 0.15 +
      Math.sin(a * 41 + seed) * 0.05;
    const mask = Math.max(0, n * 0.5 + 0.35 - (1 - amount) * 0.7);
    pos.setY(i, 6 + mask * 110 * amount + amount * 10);
  }
  g.computeBoundingSphere();
  return g;
}
