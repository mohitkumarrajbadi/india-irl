/** Spatial hash for collider streaming (meters per cell). */
export const CHUNK_SIZE = 64;

export function cellOf(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

export function cellKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/**
 * Moore neighborhood around (cx,cz).
 * @param ring 0 = single cell, 1 = 3×3 (default), 2 = 5×5
 */
export function neighborhood(
  cx: number,
  cz: number,
  ring = 1,
): { cx: number; cz: number }[] {
  const r = Math.max(0, Math.min(2, Math.floor(ring)));
  const out: { cx: number; cz: number }[] = [];
  for (let dz = -r; dz <= r; dz += 1) {
    for (let dx = -r; dx <= r; dx += 1) out.push({ cx: cx + dx, cz: cz + dz });
  }
  return out;
}
