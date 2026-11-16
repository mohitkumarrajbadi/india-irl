/**
 * Rapier collider streaming LOD — neighborhood ring by speed / region.
 * Idle stays cheap (1×1 or 3×3); highway speed expands to 5×5.
 */

export type PhysicsLodRing = 0 | 1 | 2;

/**
 * @param speed m/s drive speed
 * @param region optional terrain hint — highway biases larger ring
 */
export function physicsLodRing(
  speed: number,
  region?: "urban" | "suburban" | "highway" | "village" | "hills" | string,
): PhysicsLodRing {
  const sp = Math.abs(speed);
  if (region === "highway" && sp > 12) return 2;
  if (sp > 22) return 2;
  if (sp < 1.5 && region === "village") return 0;
  if (sp < 0.8) return 0;
  return 1;
}

/** Cell count for a Moore neighborhood of the given ring. */
export function physicsLodCellCount(ring: PhysicsLodRing): number {
  const d = ring * 2 + 1;
  return d * d;
}
