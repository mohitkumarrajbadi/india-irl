import type { Aabb, Circle } from "../world/types.ts";

export type Vec2 = { x: number; z: number };

/**
 * Resolves a horizontal circle against static boxes and circles.
 * Writes into `out` so the caller can reuse one object per frame.
 */
export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  boxes: readonly Aabb[],
  circles: readonly Circle[],
  out: Vec2,
): Vec2 {
  let px = x;
  let pz = z;

  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    const closestX = Math.max(box.minX, Math.min(px, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq >= radius * radius) continue;

    if (distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      px += dx * push;
      pz += dz * push;
      continue;
    }

    const left = px - box.minX;
    const right = box.maxX - px;
    const back = pz - box.minZ;
    const forward = box.maxZ - pz;
    const min = Math.min(left, right, back, forward);
    if (min === left) px = box.minX - radius;
    else if (min === right) px = box.maxX + radius;
    else if (min === back) pz = box.minZ - radius;
    else pz = box.maxZ + radius;
  }

  for (let i = 0; i < circles.length; i += 1) {
    const circle = circles[i];
    const dx = px - circle.x;
    const dz = pz - circle.z;
    const minDist = radius + circle.r;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) continue;
    if (distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const push = (minDist - dist) / dist;
      px += dx * push;
      pz += dz * push;
    } else {
      px += minDist;
    }
  }

  out.x = px;
  out.z = pz;
  return out;
}
