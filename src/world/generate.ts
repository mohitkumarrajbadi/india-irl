import { between, chance, mulberry32, pick, type Rng } from "../lib/rng.ts";
import type {
  Aabb,
  Block,
  Building,
  CityConfig,
  CityData,
  DistrictKind,
  LandmarkKind,
  Rect,
  RoadLine,
} from "./types.ts";

export const WALK = 2.6; // sidewalk depth inside a block
const ARTERIAL_WIDTH = 18;
const ARTERIAL_LANES = [2.7, 6.1];
const MEDIAN = 1.0;

/** Footprint (w, d) of each landmark model, in meters, at scale 1. */
export const LANDMARK_FOOTPRINT: Record<LandmarkKind, [number, number]> = {
  vidhana: [56, 34],
  ecospace: [40, 40],
  shaniwar: [46, 46],
  infotechGate: [40, 28],
  charminar: [30, 30],
  cyberTowers: [40, 40],
  cyberHub: [56, 44],
  lake: [0, 0],
};

type LotStyle = {
  lot: [number, number];
  h: [number, number];
  glass: number;
  setback: [number, number];
  skip: number;
  sign: number;
  trees: number;
};

const LOTS: Record<Exclude<DistrictKind, "park">, LotStyle> = {
  tech: { lot: [30, 38], h: [26, 92], glass: 0.78, setback: [2, 5], skip: 0.06, sign: 0.12, trees: 0.8 },
  cbd: { lot: [26, 34], h: [48, 150], glass: 0.92, setback: [2, 4], skip: 0.03, sign: 0.08, trees: 0.6 },
  resi: { lot: [17, 24], h: [14, 46], glass: 0.1, setback: [1.5, 4], skip: 0.08, sign: 0.22, trees: 0.7 },
  market: { lot: [9, 14], h: [7, 17], glass: 0, setback: [0.1, 0.4], skip: 0.02, sign: 0.9, trees: 0.3 },
  old: { lot: [10, 15], h: [6, 13], glass: 0, setback: [0.1, 0.5], skip: 0.03, sign: 0.6, trees: 0.2 },
};

const hex = (s: string) => parseInt(s.slice(1), 16);

function roadLine(rng: Rng, arterial: boolean): RoadLine {
  if (arterial) {
    return { c: 0, half: ARTERIAL_WIDTH / 2, arterial, lanes: ARTERIAL_LANES, median: MEDIAN };
  }
  const w = between(rng, 8, 10);
  return { c: 0, half: w / 2, arterial, lanes: [w / 4], median: 0 };
}

function splitLots(rect: Rect, maxW: number, maxD: number, rng: Rng, out: Rect[]): void {
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

type Edge = {
  /** Start point, direction along the edge, outward normal (toward the road). */
  x: number;
  z: number;
  ax: number;
  az: number;
  ox: number;
  oz: number;
  len: number;
  road: RoadLine;
};

function blockEdges(b: Block, roadsX: RoadLine[], roadsZ: RoadLine[], inset: number): Edge[] {
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  return [
    { x: b.minX, z: b.minZ + inset, ax: 1, az: 0, ox: 0, oz: -1, len: w, road: roadsZ[b.bj] },
    { x: b.minX, z: b.maxZ - inset, ax: 1, az: 0, ox: 0, oz: 1, len: w, road: roadsZ[b.bj + 1] },
    { x: b.minX + inset, z: b.minZ, ax: 0, az: 1, ox: -1, oz: 0, len: d, road: roadsX[b.bi] },
    { x: b.maxX - inset, z: b.minZ, ax: 0, az: 1, ox: 1, oz: 0, len: d, road: roadsX[b.bi + 1] },
  ];
}

export function generateCity(cfg: CityConfig): CityData {
  const rng = mulberry32(cfg.seed);
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

  const landmarkAt = new Map(cfg.landmarks.map((l) => [`${l.bi},${l.bj}`, l]));
  const protectedCells = new Set<string>([
    `${cfg.spawn.bi},${cfg.spawn.bj}`,
    ...cfg.landmarks.map((l) => `${l.bi},${l.bj}`),
    ...cfg.meets.map((m) => `${m.bi},${m.bj}`),
  ]);
  // Carve an irregular green fringe so the city silhouette isn't a perfect rectangle.
  // Corner bites + mid-edge notches, city-seeded, never eats landmarks/spawn/meets.
  const fringeCells = new Set<string>();
  const bite = (bi: number, bj: number, p: number) => {
    if (bi < 0 || bj < 0 || bi >= cols || bj >= rows) return;
    const key = `${bi},${bj}`;
    if (protectedCells.has(key)) return;
    if (chance(rng, p)) fringeCells.add(key);
  };
  // Missing / soft corners (asymmetric per city seed).
  for (const [ci, cj] of [
    [0, 0],
    [cols - 1, 0],
    [0, rows - 1],
    [cols - 1, rows - 1],
  ] as const) {
    const depth = 1 + Math.floor(rng() * (cfg.id === "gurugram" ? 2 : 3));
    for (let d = 0; d < depth; d += 1) {
      for (let e = 0; e < depth - d; e += 1) {
        const sbi = ci === 0 ? d : cols - 1 - d;
        const sbj = cj === 0 ? e : rows - 1 - e;
        bite(sbi, sbj, 0.92 - d * 0.12);
        bite(ci === 0 ? e : cols - 1 - e, cj === 0 ? d : rows - 1 - d, 0.85 - d * 0.1);
      }
    }
  }
  // Mid-edge notches — Pune/Hyd get more organic bites; Gurugram stays sharper.
  const notchP = cfg.id === "gurugram" ? 0.28 : cfg.id === "bengaluru" ? 0.4 : 0.48;
  for (let i = 2; i < cols - 2; i += 1) {
    bite(i, 0, notchP);
    bite(i, rows - 1, notchP * 0.9);
  }
  for (let j = 2; j < rows - 2; j += 1) {
    bite(0, j, notchP * 0.85);
    bite(cols - 1, j, notchP);
  }

  const blocks: Block[] = [];
  for (let bi = 0; bi < cols; bi += 1) {
    for (let bj = 0; bj < rows; bj += 1) {
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

  const buildings: Building[] = [];
  const tanks: CityData["tanks"] = [];
  const signs: CityData["signs"] = [];
  const billboards: CityData["billboards"] = [];
  const trees: CityData["trees"] = [];
  const shrubs: CityData["shrubs"] = [];
  const lamps: CityData["lamps"] = [];
  const busStops: CityData["busStops"] = [];
  const stalls: CityData["stalls"] = [];
  const extras: CityData["extras"] = [];
  const cows: CityData["cows"] = [];
  const strays: CityData["strays"] = [];
  const parked: CityData["parked"] = [];
  const boxes: Aabb[] = [];
  const circles: CityData["circles"] = [];
  const landmarks: CityData["landmarks"] = [];
  let lake: Rect | null = null;

  const signCells = cfg.shops.length;
  const concrete = cfg.palette.concrete.map(hex);
  const glass = cfg.palette.glass.map(hex);
  const old = cfg.palette.old.map(hex);
  const treeColors = cfg.palette.tree.map(hex);
  const bloomColors = cfg.palette.bloom.map(hex);

  const addTree = (x: number, z: number, big = 1) => {
    const bloom = chance(rng, 0.1);
    trees.push({
      x,
      z,
      s: between(rng, 0.8, 1.3) * big,
      color: bloom ? pick(rng, bloomColors) : pick(rng, treeColors),
    });
    circles.push({ x, z, r: 0.3 });
  };

  for (const b of blocks) {
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const bw = b.maxX - b.minX;
    const bd = b.maxZ - b.minZ;

    if (b.kind === "landmark" || b.kind === "lake") {
      const spec = landmarkAt.get(`${b.bi},${b.bj}`);
      if (!spec) continue;
      if (spec.kind === "lake") {
        lake = { minX: b.minX + WALK, maxX: b.maxX - WALK, minZ: b.minZ + WALK, maxZ: b.maxZ - WALK };
        landmarks.push({ spec, x: cx, z: cz, w: bw, d: bd });
        // Water blocks the player except along the bridge corridor.
        boxes.push(
          { minX: lake.minX, maxX: lake.maxX, minZ: lake.minZ, maxZ: cz - 5.5, h: 0 },
          { minX: lake.minX, maxX: lake.maxX, minZ: cz + 5.5, maxZ: lake.maxZ, h: 0 },
        );
      } else {
        const [fw, fd] = LANDMARK_FOOTPRINT[spec.kind];
        const s = Math.min(1, (bw - 6) / fw, (bd - 6) / fd);
        landmarks.push({ spec, x: cx, z: cz, w: fw * s, d: fd * s });
        boxes.push({
          minX: cx - (fw * s) / 2,
          maxX: cx + (fw * s) / 2,
          minZ: cz - (fd * s) / 2,
          maxZ: cz + (fd * s) / 2,
          h: 60,
        });
      }
    } else if (b.kind === "park") {
      // Fringe parks (irregular city edge) are greener / more open — softens the square silhouette.
      const dens = b.fringe ? 68 : 95;
      const count = Math.floor((bw * bd) / dens);
      for (let k = 0; k < count; k += 1) {
        addTree(between(rng, b.minX + 3, b.maxX - 3), between(rng, b.minZ + 3, b.maxZ - 3), b.fringe ? 1.25 : 1.15);
      }
    } else {
      const style = LOTS[b.kind];
      const lots: Rect[] = [];
      splitLots(
        { minX: b.minX + WALK, maxX: b.maxX - WALK, minZ: b.minZ + WALK, maxZ: b.maxZ - WALK },
        between(rng, style.lot[0], style.lot[1]),
        between(rng, style.lot[0], style.lot[1]),
        rng,
        lots,
      );

      // Taller toward the district core.
      const dist = cfg.districts[b.district];
      let core = 0.5;
      if (dist) {
        const dx = b.bi - (dist.i0 + dist.i1) / 2;
        const dz = b.bj - (dist.j0 + dist.j1) / 2;
        const radius = Math.max(dist.i1 - dist.i0, dist.j1 - dist.j0) / 2 + 0.75;
        core = 1 - Math.min(1, Math.hypot(dx, dz) / radius);
      }

      for (const lot of lots) {
        if (chance(rng, style.skip)) {
          addTree((lot.minX + lot.maxX) / 2, (lot.minZ + lot.maxZ) / 2, 1.2);
          continue;
        }
        const sb = between(rng, style.setback[0], style.setback[1]);
        const minX = lot.minX + sb;
        const maxX = lot.maxX - sb;
        const minZ = lot.minZ + sb;
        const maxZ = lot.maxZ - sb;
        const w = maxX - minX;
        const d = maxZ - minZ;
        if (w < 5 || d < 5) continue;

        const t = Math.pow(rng(), 1.4);
        const h = style.h[0] + (style.h[1] - style.h[0]) * t * (0.4 + 0.6 * core);
        const isGlass = chance(rng, style.glass);
        const isShop = b.kind === "market" || b.kind === "old";
        const color = isGlass ? pick(rng, glass) : b.kind === "old" ? pick(rng, old) : pick(rng, concrete);
        const x = (minX + maxX) / 2;
        const z = (minZ + maxZ) / 2;

        buildings.push({ x, z, w, d, h, y: 0, color, style: isGlass ? 1 : isShop ? 2 : 0, seed: rng() });
        boxes.push({ minX, maxX, minZ, maxZ, h });

        if (h > 38) {
          const th = h * 0.22;
          buildings.push({ x, z, w: w * 0.68, d: d * 0.68, h: th, y: h, color, style: isGlass ? 1 : 0, seed: rng() });
        }
        if (!isGlass) {
          const rx = between(rng, minX + 1.5, maxX - 1.5);
          const rz = between(rng, minZ + 1.5, maxZ - 1.5);
          if (chance(rng, 0.6)) tanks.push({ x: rx, y: h, z: rz });
          if (chance(rng, 0.5)) {
            buildings.push({
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

        // Shop sign on the facade that faces the street, if this lot touches it.
        if (h < 24 && chance(rng, style.sign)) {
          const cell = Math.floor(rng() * signCells);
          const sw = Math.min(6, w * 0.8);
          const near = 3.6;
          if (minZ - (b.minZ + WALK) < near) signs.push({ x, y: 3.5, z: minZ - 0.06, rot: Math.PI, w: sw, h: 1.1, cell });
          else if (b.maxZ - WALK - maxZ < near) signs.push({ x, y: 3.5, z: maxZ + 0.06, rot: 0, w: sw, h: 1.1, cell });
          else if (minX - (b.minX + WALK) < near) signs.push({ x: minX - 0.06, y: 3.5, z, rot: -Math.PI / 2, w: Math.min(6, d * 0.8), h: 1.1, cell });
          else if (b.maxX - WALK - maxX < near) signs.push({ x: maxX + 0.06, y: 3.5, z, rot: Math.PI / 2, w: Math.min(6, d * 0.8), h: 1.1, cell });
        }
      }
    }

    // Everything below lives on the sidewalk ring of each block.
    const edges = blockEdges(b, roadsX, roadsZ, 1.3);
    for (const e of edges) {
      const rot = Math.atan2(e.ox, e.oz);
      const treeP = b.kind === "park" ? 0.9 : b.kind === "landmark" || b.kind === "lake" ? 0.5 : LOTS[b.kind].trees;

      for (let s = between(rng, 6, 9); s < e.len - 6; s += between(rng, 10, 15)) {
        if (chance(rng, treeP)) addTree(e.x + e.ax * s + e.ox * 0.4, e.z + e.az * s + e.oz * 0.4);
      }
      const lampGap = e.road.arterial ? 28 : 38;
      for (let s = lampGap / 2; s < e.len - 5; s += lampGap) {
        if (e.road.arterial || chance(rng, 0.7)) {
          lamps.push({ x: e.x + e.ax * s + e.ox * 0.7, z: e.z + e.az * s + e.oz * 0.7, rot });
        }
      }

      const mid = e.len * between(rng, 0.3, 0.7);
      const px = e.x + e.ax * mid;
      const pz = e.z + e.az * mid;
      if (e.road.arterial && chance(rng, 0.55) && b.kind !== "park") {
        busStops.push({ x: px + e.ox * 0.2, z: pz + e.oz * 0.2, rot, s: 1, v: 0 });
        const quarter = Math.abs(e.ox) > 0.5;
        boxes.push({
          minX: px - (quarter ? 0.8 : 1.7),
          maxX: px + (quarter ? 0.8 : 1.7),
          minZ: pz - (quarter ? 1.7 : 0.8),
          maxZ: pz + (quarter ? 1.7 : 0.8),
          h: 2.6,
        });
      }
      if ((b.kind === "market" || b.kind === "old") && chance(rng, 0.5)) {
        const s2 = e.len * between(rng, 0.15, 0.85);
        const sx = e.x + e.ax * s2 + e.ox * 0.9;
        const sz = e.z + e.az * s2 + e.oz * 0.9;
        stalls.push({ x: sx, z: sz, rot, s: 1, v: Math.floor(rng() * 4) });
        circles.push({ x: sx, z: sz, r: 1.1 });
      }
      // City-flavoured street life: carts, shrines, cranes, tankers.
      {
        const s2 = e.len * between(rng, 0.12, 0.88);
        const id = cfg.id;
        let kind: number | null = null;
        if ((b.kind === "market" || b.kind === "old") && chance(rng, id === "hyderabad" ? 0.38 : 0.28)) {
          kind = chance(rng, 0.55) ? 0 : chance(rng, 0.5) ? 1 : 4; // fruit / flower / news
        } else if ((b.kind === "old" || b.kind === "market") && chance(rng, b.kind === "old" ? (id === "hyderabad" ? 0.35 : 0.22) : 0.06)) {
          kind = 2; // roadside shrine
        } else if (
          (b.kind === "tech" || b.kind === "cbd") &&
          e.road.arterial &&
          chance(rng, id === "gurugram" ? 0.14 : id === "hyderabad" ? 0.08 : 0.04)
        ) {
          kind = 3; // crane — arterial tech corridors only
        } else if (e.road.arterial && chance(rng, id === "bengaluru" ? 0.08 : 0.05)) {
          kind = 5; // water tanker
        } else if (b.kind === "park" && chance(rng, id === "pune" ? 0.22 : 0.1)) {
          kind = 1; // flower cart near gardens
        } else if (
          e.road.arterial &&
          chance(
            rng,
            id === "bengaluru" ? 0.22 : id === "gurugram" ? 0.2 : id === "hyderabad" ? 0.16 : 0.13,
          )
        ) {
          kind = 6; // traffic signal — denser on Bengaluru / Gurugram arterials
        } else if (e.road.arterial && chance(rng, id === "bengaluru" || id === "gurugram" ? 0.16 : 0.1)) {
          kind = 7; // speed breaker — IT corridors love them
        } else if (
          e.road.arterial &&
          (b.kind === "tech" || b.kind === "market" || b.kind === "cbd") &&
          chance(rng, id === "gurugram" || id === "hyderabad" ? 0.14 : 0.09)
        ) {
          kind = 8; // auto stand bay
        }
        if (kind !== null) {
          // Speed breakers sit in the near lane; everything else stays on the kerb.
          const into =
            kind === 7 ? 1.3 + (e.road.lanes[0] ?? e.road.half * 0.45) : kind === 6 ? 0.35 : 0.95;
          const sx = e.x + e.ax * s2 + e.ox * into;
          const sz = e.z + e.az * s2 + e.oz * into;
          extras.push({ x: sx, z: sz, rot, s: kind === 3 ? between(rng, 0.85, 1.15) : 1, v: kind });
          if (kind === 3) boxes.push({ minX: sx - 1.2, maxX: sx + 1.2, minZ: sz - 1.2, maxZ: sz + 1.2, h: 28 });
          else if (kind === 6) circles.push({ x: sx, z: sz, r: 0.35 });
          else if (kind === 7) {
            /* speed breakers sit in the carriageway — no solid collider */
          } else if (kind === 8) circles.push({ x: sx, z: sz, r: 1.4 });
          else circles.push({ x: sx, z: sz, r: kind === 5 ? 1.6 : 0.9 });
        }
      }
      if ((b.kind === "market" || b.kind === "old" || b.kind === "tech") && chance(rng, 0.45)) {
        const kind = chance(rng, 0.22) ? 1 : 0;
        const count = kind === 1 ? 2 : 3 + Math.floor(rng() * 4);
        const start = e.len * between(rng, 0.1, 0.6);
        for (let k = 0; k < count; k += 1) {
          const pos = start + k * (kind === 1 ? 2.6 : 0.95);
          const x = e.x + e.ax * pos + e.ox * 0.75;
          const z = e.z + e.az * pos + e.oz * 0.75;
          parked.push({ x, z, rot: rot + Math.PI / 2 + (kind === 0 ? between(rng, -0.1, 0.1) : 0), s: 1, v: Math.floor(rng() * 8), kind });
          circles.push({ x, z, r: kind === 1 ? 1.0 : 0.45 });
        }
      }
      if ((b.kind === "tech" || b.kind === "cbd") && e.road.arterial && chance(rng, 0.3)) {
        const pos = e.len * between(rng, 0.25, 0.75);
        const x = e.x + e.ax * pos + e.ox * 0.2;
        const z = e.z + e.az * pos + e.oz * 0.2;
        billboards.push({ x, y: 9.5, z, rot, w: 14, h: 3.5, cell: Math.floor(rng() * 8) });
        circles.push({ x, z, r: 0.5 });
      }
    }
  }

  for (let i = 0; i < cfg.cows; i += 1) {
    const pool = blocks.filter((b) => b.kind === "market" || b.kind === "old");
    const b = pool.length > 0 ? pick(rng, pool) : blocks[0];
    const e = pick(rng, blockEdges(b, roadsX, roadsZ, 3.2));
    const s = e.len * between(rng, 0.2, 0.8);
    const x = e.x + e.ax * s;
    const z = e.z + e.az * s;
    cows.push({ x, z, rot: between(rng, 0, Math.PI * 2), s: between(rng, 0.9, 1.1), v: Math.floor(rng() * 3) });
    circles.push({ x, z, r: 0.9 });
  }

  // Street dogs — city flavour: Bengaluru/Gurugram tech belts, Pune parks, Hyd markets.
  for (let i = 0; i < cfg.dogs; i += 1) {
    const id = cfg.id;
    const pool = blocks.filter((b) => {
      if (id === "bengaluru" || id === "gurugram") return b.kind === "tech" || b.kind === "cbd" || b.kind === "park" || b.kind === "market";
      if (id === "pune") return b.kind === "park" || b.kind === "resi" || b.kind === "market" || b.kind === "old";
      return b.kind === "market" || b.kind === "old" || b.kind === "park" || b.fringe;
    });
    const b = pool.length > 0 ? pick(rng, pool) : blocks[0];
    const e = pick(rng, blockEdges(b, roadsX, roadsZ, 2.0));
    const s = e.len * between(rng, 0.15, 0.85);
    const x = e.x + e.ax * s + e.ox * between(rng, 0.2, 0.8);
    const z = e.z + e.az * s + e.oz * between(rng, 0.2, 0.8);
    strays.push({
      x,
      z,
      rot: between(rng, 0, Math.PI * 2),
      s: between(rng, 0.85, 1.15),
      v: Math.floor(rng() * 4),
      kind: 0,
    });
    circles.push({ x, z, r: 0.35 });
  }

  // Goats — denser in Hyderabad old city / market lanes; rare on Gurugram glass corridors.
  for (let i = 0; i < cfg.goats; i += 1) {
    const id = cfg.id;
    const pool = blocks.filter((b) => {
      if (id === "hyderabad") return b.kind === "old" || b.kind === "market";
      if (id === "pune") return b.kind === "old" || b.kind === "market" || b.kind === "resi";
      return b.kind === "old" || b.kind === "market" || b.fringe;
    });
    const b = pool.length > 0 ? pick(rng, pool) : blocks[0];
    const e = pick(rng, blockEdges(b, roadsX, roadsZ, 2.4));
    const s = e.len * between(rng, 0.2, 0.8);
    const x = e.x + e.ax * s + e.ox * 0.5;
    const z = e.z + e.az * s + e.oz * 0.5;
    strays.push({
      x,
      z,
      rot: between(rng, 0, Math.PI * 2),
      s: between(rng, 0.9, 1.2),
      v: Math.floor(rng() * 3),
      kind: 1,
    });
    circles.push({ x, z, r: 0.4 });
  }

  // Median shrubs along arterials (stay out of the intersection boxes).
  for (let i = 0; i <= cols; i += 1) {
    if (!roadsX[i].arterial) continue;
    for (let j = 0; j < rows; j += 1) {
      for (let z = zs[j] + roadsZ[j].half + 4; z < zs[j + 1] - roadsZ[j + 1].half - 3; z += 6.5) {
        shrubs.push({ x: xs[i], z, s: between(rng, 0.7, 1.2) });
      }
    }
  }
  for (let j = 0; j <= rows; j += 1) {
    if (!roadsZ[j].arterial) continue;
    for (let i = 0; i < cols; i += 1) {
      for (let x = xs[i] + roadsX[i].half + 4; x < xs[i + 1] - roadsX[i + 1].half - 3; x += 6.5) {
        shrubs.push({ x, z: zs[j], s: between(rng, 0.7, 1.2) });
      }
    }
  }

  // Elevated metro: pillars stand mid-block on the median, never in a junction.
  const metroPillars: CityData["metroPillars"] = [];
  const stations: CityData["metroSegments"] = [];
  const m = cfg.metro;
  const along = m.axis === "x" ? zs : xs;
  const alongRoads = m.axis === "x" ? roadsZ : roadsX;
  const fixed = m.axis === "x" ? xs[m.index] : zs[m.index];
  const count = m.axis === "x" ? rows : cols;
  for (let k = 0; k < count; k += 1) {
    const a0 = along[k] + alongRoads[k].half;
    const a1 = along[k + 1] - alongRoads[k + 1].half;
    const len = a1 - a0;
    const n = len > 62 ? 2 : 1;
    for (let p = 1; p <= n; p += 1) {
      const a = a0 + (len * p) / (n + 1);
      const px = m.axis === "x" ? fixed : a;
      const pz = m.axis === "x" ? a : fixed;
      metroPillars.push({ x: px, z: pz });
      circles.push({ x: px, z: pz, r: 0.85 });
    }
    if (k % 3 === 1) {
      const mid = (a0 + a1) / 2;
      stations.push({
        x0: m.axis === "x" ? fixed : mid - 22,
        z0: m.axis === "x" ? mid - 22 : fixed,
        x1: m.axis === "x" ? fixed : mid + 22,
        z1: m.axis === "x" ? mid + 22 : fixed,
        station: true,
      });
    }
  }
  const first = metroPillars[0];
  const last = metroPillars[metroPillars.length - 1];
  const metroLine = { x0: first.x, z0: first.z, x1: last.x, z1: last.z };

  // Invisible walls just outside the outer ring road.
  const pad = 14;
  boxes.push(
    { minX: bounds.minX - 80, maxX: bounds.minX - pad, minZ: bounds.minZ - 80, maxZ: bounds.maxZ + 80, h: 0 },
    { minX: bounds.maxX + pad, maxX: bounds.maxX + 80, minZ: bounds.minZ - 80, maxZ: bounds.maxZ + 80, h: 0 },
    { minX: bounds.minX - 80, maxX: bounds.maxX + 80, minZ: bounds.minZ - 80, maxZ: bounds.minZ - pad, h: 0 },
    { minX: bounds.minX - 80, maxX: bounds.maxX + 80, minZ: bounds.maxZ + pad, maxZ: bounds.maxZ + 80, h: 0 },
  );

  const sb = blocks.find((b) => b.bi === cfg.spawn.bi && b.bj === cfg.spawn.bj) as Block;
  const meets = cfg.meets.map((spec) => {
    const b = blocks.find((blk) => blk.bi === spec.bi && blk.bj === spec.bj) ?? sb;
    return {
      spec,
      x: (b.minX + b.maxX) / 2,
      z: (b.minZ + b.maxZ) / 2,
    };
  });
  return {
    config: cfg,
    xs,
    zs,
    roadsX,
    roadsZ,
    blocks,
    buildings,
    tanks,
    signs,
    billboards,
    trees,
    shrubs,
    lamps,
    busStops,
    stalls,
    extras,
    cows,
    strays,
    parked,
    metroPillars,
    metroSegments: stations,
    metroLine,
    landmarks,
    meets,
    lake,
    boxes,
    circles,
    bounds,
    spawn: { x: (sb.minX + sb.maxX) / 2 + 9, z: sb.minZ + 1.7, yaw: Math.PI / 2 },
  };
}

/** Index of the last grid line at or below `v`, clamped to a valid block index. */
export function lineIndex(lines: readonly number[], v: number): number {
  let lo = 0;
  let hi = lines.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function blockAt(city: CityData, x: number, z: number): Block {
  const bi = lineIndex(city.xs, x);
  const bj = lineIndex(city.zs, z);
  return city.blocks[bi * city.config.rows + bj];
}

export function districtNameAt(city: CityData, x: number, z: number): string {
  const b = blockAt(city, x, z);
  const lm = city.landmarks.find((l) => l.spec.bi === b.bi && l.spec.bj === b.bj);
  if (lm && b.kind === "lake") return lm.spec.label;
  return city.config.districts[b.district]?.name ?? city.config.name;
}
