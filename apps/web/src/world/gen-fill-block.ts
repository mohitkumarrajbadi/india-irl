/** Landmark / park / building lots for one city block. */
import { between, chance } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import { LANDMARK_FOOTPRINT, LOTS, WALK } from "./gen-constants.ts";
import { splitLots } from "./gen-lots.ts";
import { placeBuilding } from "./gen-place-building.ts";
import type { Block, Rect } from "./types.ts";

type CityLandmark = GenBuffers["cfg"]["landmarks"][number];

export function fillLandmarkOrPark(g: GenBuffers, b: Block, landmarkAt: Map<string, CityLandmark>): void {
  const { rng } = g;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const bw = b.maxX - b.minX;
  const bd = b.maxZ - b.minZ;

  if (b.kind === "landmark" || b.kind === "lake") {
    const spec = landmarkAt.get(`${b.bi},${b.bj}`);
    if (!spec) return;
    if (spec.kind === "lake") {
      g.lake = { minX: b.minX + WALK, maxX: b.maxX - WALK, minZ: b.minZ + WALK, maxZ: b.maxZ - WALK };
      g.landmarks.push({ spec, x: cx, z: cz, w: bw, d: bd });
      g.boxes.push(
        { minX: g.lake.minX, maxX: g.lake.maxX, minZ: g.lake.minZ, maxZ: cz - 5.5, h: 0 },
        { minX: g.lake.minX, maxX: g.lake.maxX, minZ: cz + 5.5, maxZ: g.lake.maxZ, h: 0 },
      );
    } else {
      const [fw, fd] = LANDMARK_FOOTPRINT[spec.kind];
      const s = Math.min(1, (bw - 6) / fw, (bd - 6) / fd);
      g.landmarks.push({ spec, x: cx, z: cz, w: fw * s, d: fd * s });
      g.boxes.push({
        minX: cx - (fw * s) / 2,
        maxX: cx + (fw * s) / 2,
        minZ: cz - (fd * s) / 2,
        maxZ: cz + (fd * s) / 2,
        h: 60,
      });
    }
    return;
  }

  if (b.kind === "park") {
    const dens = b.fringe ? 68 : 95;
    const count = Math.floor((bw * bd) / dens);
    for (let k = 0; k < count; k += 1) {
      g.addTree(between(rng, b.minX + 3, b.maxX - 3), between(rng, b.minZ + 3, b.maxZ - 3), b.fringe ? 1.25 : 1.15);
    }
  }
}

export function fillBuildingLots(g: GenBuffers, b: Block): void {
  if (b.kind === "park" || b.kind === "landmark" || b.kind === "lake") return;
  const { rng, cfg } = g;
  const style = LOTS[b.kind];
  const lots: Rect[] = [];
  splitLots(
    { minX: b.minX + WALK, maxX: b.maxX - WALK, minZ: b.minZ + WALK, maxZ: b.maxZ - WALK },
    between(rng, style.lot[0], style.lot[1]),
    between(rng, style.lot[0], style.lot[1]),
    rng,
    lots,
  );

  const dist = cfg.districts[b.district];
  let core = 0.5;
  if (dist) {
    const dx = b.bi - (dist.i0 + dist.i1) / 2;
    const dz = b.bj - (dist.j0 + dist.j1) / 2;
    const radius = Math.max(dist.i1 - dist.i0, dist.j1 - dist.j0) / 2 + 0.75;
    core = 1 - Math.min(1, Math.hypot(dx, dz) / radius);
  }

  const signCells = cfg.shops.length;
  for (const lot of lots) {
    if (chance(rng, style.skip)) {
      g.addTree((lot.minX + lot.maxX) / 2, (lot.minZ + lot.maxZ) / 2, 1.2);
      continue;
    }
    placeBuilding(g, b, lot, style, core, signCells, rng);
  }
}
