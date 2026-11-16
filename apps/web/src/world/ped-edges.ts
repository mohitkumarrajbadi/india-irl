import { pick, type Rng } from "../lib/rng.ts";
import type { CityData, DistrictKind } from "./types.ts";

export type PedEdge = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  kind: DistrictKind | "landmark" | "lake";
};

/** Sidewalk spawn weights — market dense, fringe/park quiet (village ≪ city). */
const DENSITY: Record<string, number> = {
  market: 1.35,
  old: 1.2,
  tech: 0.7,
  cbd: 0.85,
  resi: 0.55,
  park: 0.45,
  landmark: 0.4,
  lake: 0.3,
};

const CITY_MULT: Record<string, number> = {
  novapura: 1.05,
  mandipura: 1.0,
  neerabad: 1.15,
  udyogabad: 0.9,
};

export function cityPedMult(cityId: string): number {
  return CITY_MULT[cityId] ?? 1;
}

export function collectPedEdges(city: CityData): PedEdge[] {
  const edges: PedEdge[] = [];
  const inset = 2.4;
  for (const b of city.blocks) {
    if (b.kind === "lake") continue;
    const minX = b.minX + inset;
    const maxX = b.maxX - inset;
    const minZ = b.minZ + inset;
    const maxZ = b.maxZ - inset;
    if (maxX - minX < 8 || maxZ - minZ < 8) continue;
    edges.push(
      { ax: minX, az: minZ, bx: maxX, bz: minZ, kind: b.kind },
      { ax: maxX, az: minZ, bx: maxX, bz: maxZ, kind: b.kind },
      { ax: maxX, az: maxZ, bx: minX, bz: maxZ, kind: b.kind },
      { ax: minX, az: maxZ, bx: minX, bz: minZ, kind: b.kind },
    );
  }
  return edges;
}

/** Prefer denser district sidewalks. */
export function pickDenseEdge(rng: Rng, edges: PedEdge[]): PedEdge {
  let edge = edges[0];
  for (let tries = 0; tries < 8; tries += 1) {
    const e = pick(rng, edges);
    const dens = DENSITY[e.kind] ?? 0.6;
    if (rng() < dens || tries === 7) {
      edge = e;
      break;
    }
  }
  return edge;
}
