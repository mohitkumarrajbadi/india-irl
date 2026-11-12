import * as THREE from "three";

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

export type InstanceOpts = {
  cast?: boolean;
  receive?: boolean;
  color?: (i: number) => THREE.ColorRepresentation;
};

/**
 * Builds a static InstancedMesh in one pass. `place` writes the transform onto
 * a shared dummy so no per-instance objects are allocated.
 */
export function makeInstanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
  place: (i: number, o: THREE.Object3D) => void,
  opts: InstanceOpts = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
  mesh.count = count;
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    place(i, dummy);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (opts.color) mesh.setColorAt(i, tint.set(opts.color(i)));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = opts.cast ?? false;
  mesh.receiveShadow = opts.receive ?? false;
  mesh.computeBoundingSphere();
  mesh.computeBoundingBox();
  return mesh;
}

export function disposeAll(...objs: (THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.InstancedMesh | null | undefined)[]): void {
  for (const o of objs) {
    if (!o) continue;
    if (o instanceof THREE.InstancedMesh) o.dispose();
    else o.dispose();
  }
}
