/**
 * City generation orchestrator — pure data, no Three.
 * Pieces live in gen-*.ts (see ENGINEERING.md LOC limits).
 */
import { between, chance, mulberry32, pick } from "../lib/rng.ts";
import { spawnAnimals } from "./gen-animals.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import { hex } from "./gen-constants.ts";
import { blockEdges } from "./gen-edges.ts";
import { fillBuildingLots, fillLandmarkOrPark } from "./gen-fill-block.ts";
import { buildBlocks, buildRoadGrid, carveFringe } from "./gen-grid.ts";
import { buildFlyover } from "./gen-flyover.ts";
import { buildMetro, placeMedianShrubs, pushOuterWalls } from "./gen-metro.ts";
import { placeJunctionSignals } from "./gen-junction-signals.ts";
import { fillStreetEdge } from "./gen-street-edge.ts";
import { addTrailColliders } from "./gen-trail-collide.ts";
import { decorateTrailLife } from "./gen-trail-life.ts";
import { buildTrailRoads } from "./gen-trail-roads.ts";
import { buildUnderpass } from "./gen-underpass.ts";
import { buildVillageSettlements } from "./gen-village-settle.ts";
import type { CityConfig, CityData } from "./types.ts";

export { WALK, LANDMARK_FOOTPRINT } from "./gen-constants.ts";
export { lineIndex, blockAt, districtNameAt } from "./gen-query.ts";

export function generateCity(cfg: CityConfig): CityData {
  const rng = mulberry32(cfg.seed);
  const { roadsX, roadsZ, xs, zs, bounds } = buildRoadGrid(cfg, rng);
  const fringeCells = carveFringe(cfg, rng);
  const blocks = buildBlocks(cfg, xs, zs, roadsX, roadsZ, fringeCells);
  const landmarkAt = new Map(cfg.landmarks.map((l) => [`${l.bi},${l.bj}`, l]));

  const g = {
    rng,
    cfg,
    roadsX,
    roadsZ,
    xs,
    zs,
    blocks,
    buildings: [],
    tanks: [],
    signs: [],
    billboards: [],
    trees: [],
    shrubs: [],
    lamps: [],
    busStops: [],
    stalls: [],
    extras: [],
    cows: [],
    strays: [],
    parked: [],
    boxes: [],
    circles: [],
    landmarks: [],
    lake: null,
    concrete: cfg.palette.concrete.map(hex),
    glass: cfg.palette.glass.map(hex),
    old: cfg.palette.old.map(hex),
    treeColors: cfg.palette.tree.map(hex),
    bloomColors: cfg.palette.bloom.map(hex),
    addTree(x: number, z: number, big = 1) {
      const bloom = chance(rng, 0.1);
      g.trees.push({
        x,
        z,
        s: between(rng, 0.8, 1.3) * big,
        color: bloom ? pick(rng, g.bloomColors) : pick(rng, g.treeColors),
      });
      g.circles.push({ x, z, r: 0.3 });
    },
  } as GenBuffers;

  for (const b of blocks) {
    fillLandmarkOrPark(g, b, landmarkAt);
    fillBuildingLots(g, b);
    for (const e of blockEdges(b, roadsX, roadsZ, 1.3)) fillStreetEdge(g, b, e);
  }

  spawnAnimals(g);
  placeMedianShrubs(g);
  placeJunctionSignals(g, bounds);
  const metro = buildMetro(g);
  const trails = buildTrailRoads(cfg, bounds, blocks, roadsX, roadsZ, xs, zs, rng);
  decorateTrailLife(g, trails);
  addTrailColliders(g, trails);
  const villages = buildVillageSettlements(g, trails, bounds);
  pushOuterWalls(g, bounds, trails);
  const flyover = buildFlyover(g);
  const underpass = buildUnderpass(g);

  const sb = blocks.find((b) => b.bi === cfg.spawn.bi && b.bj === cfg.spawn.bj)!;
  const meets = cfg.meets.map((spec) => {
    const b = blocks.find((blk) => blk.bi === spec.bi && blk.bj === spec.bj) ?? sb;
    return { spec, x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
  });

  return {
    config: cfg,
    xs,
    zs,
    roadsX,
    roadsZ,
    blocks,
    buildings: g.buildings,
    tanks: g.tanks,
    signs: g.signs,
    billboards: g.billboards,
    trees: g.trees,
    shrubs: g.shrubs,
    lamps: g.lamps,
    busStops: g.busStops,
    stalls: g.stalls,
    extras: g.extras,
    cows: g.cows,
    strays: g.strays,
    parked: g.parked,
    metroPillars: metro.metroPillars,
    metroSegments: metro.metroSegments,
    metroLine: metro.metroLine,
    landmarks: g.landmarks,
    meets,
    lake: g.lake,
    boxes: g.boxes,
    circles: g.circles,
    trails,
    flyovers: flyover ? [flyover] : [],
    underpasses: underpass ? [underpass] : [],
    villages,
    bounds,
    spawn: { x: (sb.minX + sb.maxX) / 2 + 9, z: sb.minZ + 1.7, yaw: Math.PI / 2 },
  };
}
