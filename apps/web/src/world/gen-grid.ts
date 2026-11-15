/** Roads, fringe silhouette, and block grid. */
import { between, chance, type Rng } from "../lib/rng.ts";
import { ARTERIAL_LANES, ARTERIAL_WIDTH, MEDIAN, MINOR_WIDTH } from "./gen-constants.ts";
import type { Block, CityConfig, Rect, RoadLine } from "./types.ts";

function roadLine(_rng: Rng, arterial: boolean): RoadLine {
  if (arterial) {
    return { c: 0, half: ARTERIAL_WIDTH / 2, arterial, lanes: [...ARTERIAL_LANES], median: MEDIAN };
  }
  const w = MINOR_WIDTH;
  // LHT: single lane each way, offset to the left of travel
  return { c: 0, half: w / 2, arterial, lanes: [-w / 4], median: 0 };
}

export function buildRoadGrid(cfg: CityConfig, rng: Rng): {
  roadsX: RoadLine[];
  roadsZ: RoadLine[];
  xs: number[];
  zs: number[];
  bounds: Rect;
} {
  const { cols, rows } = cfg;
  const roadsX: RoadLine[] = [];
  const roadsZ: RoadLine[] = [];
  for (let i = 0; i <= cols; i += 1) roadsX.push(roadLine(rng, i % cfg.arterialEvery === 0 || i === cols));
  for (let j = 0; j <= rows; j += 1) roadsZ.push(roadLine(rng, j % cfg.arterialEvery === 0 || j === rows));

  const layout = (lines: RoadLine[], count: number): number[] => {
    const out = [0];
    for (let i = 0; i < count; i += 1) out.push(out[i] + between(rng, cfg.block[0], cfg.block[1]));
    const shift = -out[count] / 2;
    return out.map((v, i) => {
      lines[i].c = v + shift;
      return v + shift;
    });
  };
  const xs = layout(roadsX, cols);
  const zs = layout(roadsZ, rows);
  const bounds: Rect = {
    minX: xs[0] - roadsX[0].half,
    maxX: xs[cols] + roadsX[cols].half,
    minZ: zs[0] - roadsZ[0].half,
    maxZ: zs[rows] + roadsZ[rows].half,
  };
  return { roadsX, roadsZ, xs, zs, bounds };
}

export function carveFringe(cfg: CityConfig, rng: Rng): Set<string> {
  const { cols, rows } = cfg;
  const protectedCells = new Set<string>([
    `${cfg.spawn.bi},${cfg.spawn.bj}`,
    ...cfg.landmarks.map((l) => `${l.bi},${l.bj}`),
    ...cfg.meets.map((m) => `${m.bi},${m.bj}`),
  ]);
  const fringeCells = new Set<string>();
  const bite = (bi: number, bj: number, p: number) => {
    if (bi < 0 || bj < 0 || bi >= cols || bj >= rows) return;
    const key = `${bi},${bj}`;
    if (protectedCells.has(key)) return;
    if (chance(rng, p)) fringeCells.add(key);
  };
  for (const [ci, cj] of [
    [0, 0],
    [cols - 1, 0],
    [0, rows - 1],
    [cols - 1, rows - 1],
  ] as const) {
    const depth = 1 + Math.floor(rng() * (cfg.id === "gurugram" ? 2 : 3));
    for (let d = 0; d < depth; d += 1) {
      for (let e = 0; e < depth - d; e += 1) {
        bite(ci === 0 ? d : cols - 1 - d, cj === 0 ? e : rows - 1 - e, 0.92 - d * 0.12);
        bite(ci === 0 ? e : cols - 1 - e, cj === 0 ? d : rows - 1 - d, 0.85 - d * 0.1);
      }
    }
  }
  const notchP = cfg.id === "gurugram" ? 0.28 : cfg.id === "bengaluru" ? 0.4 : 0.48;
  for (let i = 2; i < cols - 2; i += 1) {
    bite(i, 0, notchP);
    bite(i, rows - 1, notchP * 0.9);
  }
  for (let j = 2; j < rows - 2; j += 1) {
    bite(0, j, notchP * 0.85);
    bite(cols - 1, j, notchP);
  }
  return fringeCells;
}

export function buildBlocks(
  cfg: CityConfig,
  xs: number[],
  zs: number[],
  roadsX: RoadLine[],
  roadsZ: RoadLine[],
  fringeCells: Set<string>,
): Block[] {
  const landmarkAt = new Map(cfg.landmarks.map((l) => [`${l.bi},${l.bj}`, l]));
  const blocks: Block[] = [];
  for (let bi = 0; bi < cfg.cols; bi += 1) {
    for (let bj = 0; bj < cfg.rows; bj += 1) {
      const district = cfg.districts.findIndex((d) => bi >= d.i0 && bi <= d.i1 && bj >= d.j0 && bj <= d.j1);
      const landmark = landmarkAt.get(`${bi},${bj}`);
      const fringe = fringeCells.has(`${bi},${bj}`);
      const kind = landmark
        ? landmark.kind === "lake"
          ? "lake"
          : "landmark"
        : fringe
          ? "park"
          : district >= 0
            ? cfg.districts[district].kind
            : "resi";
      blocks.push({
        bi,
        bj,
        minX: xs[bi] + roadsX[bi].half,
        maxX: xs[bi + 1] - roadsX[bi + 1].half,
        minZ: zs[bj] + roadsZ[bj].half,
        maxZ: zs[bj + 1] - roadsZ[bj + 1].half,
        kind,
        district,
        fringe: fringe || undefined,
      });
    }
  }
  return blocks;
}
