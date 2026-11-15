import { between, type Rng } from "../lib/rng.ts";
import type { Rect } from "./types.ts";

export function splitLots(rect: Rect, maxW: number, maxD: number, rng: Rng, out: Rect[]): void {
  const stack: Rect[] = [rect];
  while (stack.length > 0) {
    const r = stack.pop() as Rect;
    const w = r.maxX - r.minX;
    const d = r.maxZ - r.minZ;
    const needX = w > maxW;
    const needZ = d > maxD;
    if (!needX && !needZ) {
      out.push(r);
      continue;
    }
    const t = between(rng, 0.4, 0.6);
    if (needX && (!needZ || w / maxW >= d / maxD)) {
      const m = r.minX + w * t;
      stack.push({ ...r, maxX: m }, { ...r, minX: m });
    } else {
      const m = r.minZ + d * t;
      stack.push({ ...r, maxZ: m }, { ...r, minZ: m });
    }
  }
}
