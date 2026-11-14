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

/** Player cell + 8 neighbors. */
export function neighborhood(cx: number, cz: number): { cx: number; cz: number }[] {
  const out: { cx: number; cz: number }[] = [];
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) out.push({ cx: cx + dx, cz: cz + dz });
  }
  return out;
}
