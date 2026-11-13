/** Spatial chunk collider cook / drop for streaming. */
import type RAPIER from "@dimforge/rapier3d-compat";

export function cellKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function unloadChunk(
  world: RAPIER.World,
  store: Map<string, RAPIER.Collider[]>,
  cellX: number,
  cellZ: number,
): void {
  const key = cellKey(cellX, cellZ);
  const list = store.get(key);
  if (!list) return;
  for (const c of list) world.removeCollider(c, true);
  store.delete(key);
}

export function loadChunk(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  store: Map<string, RAPIER.Collider[]>,
  cellX: number,
  cellZ: number,
  boxes: Float32Array,
): void {
  unloadChunk(world, store, cellX, cellZ);
  const list: RAPIER.Collider[] = [];
  const fixed = world.createRigidBody(rapier.RigidBodyDesc.fixed());
  for (let i = 0; i + 5 < boxes.length; i += 6) {
    const minX = boxes[i];
    const minY = boxes[i + 1];
    const minZ = boxes[i + 2];
    const maxX = boxes[i + 3];
    const maxY = boxes[i + 4];
    const maxZ = boxes[i + 5];
    const hx = Math.max(0.05, (maxX - minX) * 0.5);
    const hy = Math.max(0.05, (maxY - minY) * 0.5);
    const hz = Math.max(0.05, (maxZ - minZ) * 0.5);
    const c = world.createCollider(
      rapier.ColliderDesc.cuboid(hx, hy, hz).setTranslation(
        (minX + maxX) * 0.5,
        (minY + maxY) * 0.5,
        (minZ + maxZ) * 0.5,
      ),
      fixed,
    );
    list.push(c);
  }
  store.set(cellKey(cellX, cellZ), list);
}
