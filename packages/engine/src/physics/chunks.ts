/**
 * Chunk collider cook / drop.
 * Obstacles → cuboids; road surface → trimesh (splat/mesh-aligned Y=0).
 * CCD is on dynamics (sim-spawn); statics use friction materials here.
 */
import type RAPIER from "@dimforge/rapier3d-compat";
import {
  ROAD_FRICTION,
  ROAD_RESTITUTION,
  WALL_FRICTION,
  WALL_RESTITUTION,
} from "./materials.ts";

export type ChunkResident = {
  body: RAPIER.RigidBody;
  colliders: RAPIER.Collider[];
};

export function cellKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function unloadChunk(
  world: RAPIER.World,
  store: Map<string, ChunkResident>,
  cellX: number,
  cellZ: number,
): void {
  const key = cellKey(cellX, cellZ);
  const res = store.get(key);
  if (!res) return;
  for (const c of res.colliders) world.removeCollider(c, true);
  world.removeRigidBody(res.body);
  store.delete(key);
}

function cookBoxes(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  boxes: Float32Array,
  out: RAPIER.Collider[],
): void {
  for (let i = 0; i + 5 < boxes.length; i += 6) {
    const hx = Math.max(0.05, (boxes[i + 3] - boxes[i]) * 0.5);
    const hy = Math.max(0.05, (boxes[i + 4] - boxes[i + 1]) * 0.5);
    const hz = Math.max(0.05, (boxes[i + 5] - boxes[i + 2]) * 0.5);
    const desc = rapier.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(
        (boxes[i] + boxes[i + 3]) * 0.5,
        (boxes[i + 1] + boxes[i + 4]) * 0.5,
        (boxes[i + 2] + boxes[i + 5]) * 0.5,
      )
      .setFriction(WALL_FRICTION)
      .setRestitution(WALL_RESTITUTION);
    out.push(world.createCollider(desc, body));
  }
}

function cookRoadTrimesh(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  verts: Float32Array,
  indices: Uint32Array,
  out: RAPIER.Collider[],
): void {
  if (verts.length < 9 || indices.length < 3) return;
  const desc = rapier.ColliderDesc.trimesh(verts, indices)
    .setFriction(ROAD_FRICTION)
    .setRestitution(ROAD_RESTITUTION);
  out.push(world.createCollider(desc, body));
}

/** Replace resident colliders for one 64 m cell. */
export function loadChunk(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  store: Map<string, ChunkResident>,
  cellX: number,
  cellZ: number,
  boxes: Float32Array,
  roadVerts?: Float32Array,
  roadIndices?: Uint32Array,
): void {
  unloadChunk(world, store, cellX, cellZ);
  const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
  const colliders: RAPIER.Collider[] = [];
  cookBoxes(rapier, world, body, boxes, colliders);
  if (roadVerts && roadIndices) {
    cookRoadTrimesh(rapier, world, body, roadVerts, roadIndices, colliders);
  }
  store.set(cellKey(cellX, cellZ), { body, colliders });
}
