/** Place one building (massing, roof junk, shop sign) into gen buffers. */
import { between, chance, pick, type Rng } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import { LOTS, WALK } from "./gen-constants.ts";
import type { Block, Rect } from "./types.ts";

export function placeBuilding(
  g: GenBuffers,
  b: Block,
  lot: Rect,
  style: (typeof LOTS)[keyof typeof LOTS],
  core: number,
  signCells: number,
  rng: Rng,
): void {
  const sb = between(rng, style.setback[0], style.setback[1]);
  const minX = lot.minX + sb;
  const maxX = lot.maxX - sb;
  const minZ = lot.minZ + sb;
  const maxZ = lot.maxZ - sb;
  const w = maxX - minX;
  const d = maxZ - minZ;
  if (w < 5 || d < 5) return;

  const t = Math.pow(rng(), 1.4);
  const h = style.h[0] + (style.h[1] - style.h[0]) * t * (0.4 + 0.6 * core);
  const isGlass = chance(rng, style.glass);
  const isShop = b.kind === "market" || b.kind === "old";
  const color = isGlass ? pick(rng, g.glass) : b.kind === "old" ? pick(rng, g.old) : pick(rng, g.concrete);
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;

  g.buildings.push({ x, z, w, d, h, y: 0, color, style: isGlass ? 1 : isShop ? 2 : 0, seed: rng() });
  g.boxes.push({ minX, maxX, minZ, maxZ, h });

  if (h > 38) {
    g.buildings.push({ x, z, w: w * 0.68, d: d * 0.68, h: h * 0.22, y: h, color, style: isGlass ? 1 : 0, seed: rng() });
  }
  if (!isGlass) {
    if (chance(rng, 0.6)) {
      g.tanks.push({
        x: between(rng, minX + 1.5, maxX - 1.5),
        y: h,
        z: between(rng, minZ + 1.5, maxZ - 1.5),
      });
    }
    if (chance(rng, 0.5)) {
      g.buildings.push({
        x: between(rng, minX + 2, maxX - 2),
        z: between(rng, minZ + 2, maxZ - 2),
        w: 2.6,
        d: 2.6,
        h: 2.4,
        y: h,
        color: 0xcfc6b4,
        style: 0,
        seed: rng(),
      });
    }
  }

  if (h < 24 && chance(rng, style.sign)) {
    const cell = Math.floor(rng() * signCells);
    const sw = Math.min(6, w * 0.8);
    const near = 3.6;
    if (minZ - (b.minZ + WALK) < near) g.signs.push({ x, y: 3.5, z: minZ - 0.06, rot: Math.PI, w: sw, h: 1.1, cell });
    else if (b.maxZ - WALK - maxZ < near) g.signs.push({ x, y: 3.5, z: maxZ + 0.06, rot: 0, w: sw, h: 1.1, cell });
    else if (minX - (b.minX + WALK) < near) g.signs.push({ x: minX - 0.06, y: 3.5, z, rot: -Math.PI / 2, w: Math.min(6, d * 0.8), h: 1.1, cell });
    else if (b.maxX - WALK - maxX < near) g.signs.push({ x: maxX + 0.06, y: 3.5, z, rot: Math.PI / 2, w: Math.min(6, d * 0.8), h: 1.1, cell });
  }
}
