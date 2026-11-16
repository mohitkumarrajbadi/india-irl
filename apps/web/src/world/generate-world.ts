/**
 * Unified OMMO world generation — region packs + highway corridors.
 * Returns CityData shaped for existing render/physics paths.
 */
import { CITIES } from "./cities.ts";
import {
  WORLD_SEED,
  cityWorldOffset,
  destinationFromCityMeet,
  fullCorridors,
  prototypeCorridors,
  resolveDestination,
  type CorridorSpec,
  type WorldDestination,
} from "./atlas.ts";
import { generateCity } from "./generate.ts";
import { buildCorridor } from "./gen-corridor.ts";
import { mergeBounds, offsetCityData } from "./offset-city.ts";
import type { CityConfig, CityData, CityId } from "./types.ts";

export type WorldGenOptions = {
  /** Prototype: novapura + mandipura. Full: all four metros. */
  mode?: "prototype" | "full";
  destId?: string | null;
  cityId?: CityId;
  meetId?: string | null;
};

function slimMandipura(cfg: CityConfig): CityConfig {
  // Slightly smaller fabric for prototype memory; still a real city core.
  return {
    ...cfg,
    cols: Math.min(cfg.cols, 9),
    rows: Math.min(cfg.rows, 10),
  };
}

function emptyFrom(primary: CityData): CityData {
  return {
    ...primary,
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
    metroPillars: [],
    metroSegments: [],
    landmarks: [],
    meets: [],
    boxes: [],
    circles: [],
    trails: [],
    villages: [],
    flyover: null,
    underpass: null,
    lake: null,
  };
}

function appendCity(into: CityData, pack: CityData): void {
  into.xs.push(...pack.xs);
  into.zs.push(...pack.zs);
  into.roadsX.push(...pack.roadsX);
  into.roadsZ.push(...pack.roadsZ);
  into.blocks.push(...pack.blocks);
  into.buildings.push(...pack.buildings);
  into.tanks.push(...pack.tanks);
  into.signs.push(...pack.signs);
  into.billboards.push(...pack.billboards);
  into.trees.push(...pack.trees);
  into.shrubs.push(...pack.shrubs);
  into.lamps.push(...pack.lamps);
  into.busStops.push(...pack.busStops);
  into.stalls.push(...pack.stalls);
  into.extras.push(...pack.extras);
  into.cows.push(...pack.cows);
  into.strays.push(...pack.strays);
  into.parked.push(...pack.parked);
  into.metroPillars.push(...pack.metroPillars);
  into.metroSegments.push(...pack.metroSegments);
  into.landmarks.push(...pack.landmarks);
  into.meets.push(...pack.meets);
  into.boxes.push(...pack.boxes);
  into.circles.push(...pack.circles);
  into.trails.push(...pack.trails);
  into.villages.push(...pack.villages);
  if (!into.flyover && pack.flyover) into.flyover = pack.flyover;
  if (!into.underpass && pack.underpass) into.underpass = pack.underpass;
  if (!into.lake && pack.lake) into.lake = pack.lake;
  into.bounds = mergeBounds(into.bounds, pack.bounds);
}

function pickSpawn(
  world: CityData,
  villageSpawn: { x: number; z: number; yaw: number },
  opts: WorldGenOptions,
): { spawn: CityData["spawn"]; dest: WorldDestination } {
  let dest =
    opts.destId != null && opts.destId !== ""
      ? resolveDestination(opts.destId)
      : destinationFromCityMeet(opts.cityId ?? "novapura", opts.meetId ?? null);

  if (dest.id === "highway-dhaba" || dest.id === "village-square") {
    return { spawn: { ...villageSpawn }, dest };
  }

  if (dest.meetId) {
    const meet = world.meets.find((m) => m.spec.id === dest.meetId);
    if (meet) {
      return {
        spawn: { x: meet.x + 3.5, z: meet.z + 3.5, yaw: dest.yaw || Math.PI / 2 },
        dest: { ...dest, x: meet.x, z: meet.z },
      };
    }
  }

  const packSpawn = world.meets.find((m) => m.spec.id === "kaapi-block") ?? world.meets[0];
  if (packSpawn) {
    return {
      spawn: { x: packSpawn.x + 3.5, z: packSpawn.z + 3.5, yaw: Math.PI / 2 },
      dest: { ...dest, x: packSpawn.x, z: packSpawn.z },
    };
  }
  return { spawn: world.spawn, dest };
}

/** Generate the connected world (prototype or full). */
export function generateWorld(opts: WorldGenOptions = {}): CityData {
  const mode = opts.mode ?? "prototype";
  const novoOff = cityWorldOffset("novapura");
  const novoLocal = generateCity(CITIES.novapura);
  const novo = offsetCityData(novoLocal, novoOff.x, novoOff.z);

  const world = emptyFrom(novo);
  world.config = {
    ...novo.config,
    name: "OMMO",
    tagline: "One connected world — many cities.",
  };
  appendCity(world, novo);

  const mandiOff = cityWorldOffset("mandipura");
  const mandiCfg = mode === "prototype" ? slimMandipura(CITIES.mandipura) : CITIES.mandipura;
  const mandi = offsetCityData(generateCity(mandiCfg), mandiOff.x, mandiOff.z);
  appendCity(world, mandi);

  if (mode === "full") {
    for (const id of ["neerabad", "udyogabad"] as CityId[]) {
      const off = cityWorldOffset(id);
      appendCity(world, offsetCityData(generateCity(CITIES[id]), off.x, off.z));
    }
  }

  const specs: CorridorSpec[] = mode === "full" ? fullCorridors() : prototypeCorridors();
  let primaryVillageSpawn = { x: 3100, z: 570, yaw: 0 };
  specs.forEach((spec, i) => {
    const corridor = buildCorridor(spec, WORLD_SEED + i * 97);
    world.trails.push(...corridor.trails);
    world.boxes.push(...corridor.boxes);
    world.trees.push(...corridor.trees);
    world.lamps.push(...corridor.lamps);
    world.stalls.push(...corridor.stalls);
    world.villages.push(...corridor.villages);
    if (i === 0) primaryVillageSpawn = corridor.villageSpawn;
    for (const p of corridor.trails[0]?.points ?? []) {
      world.bounds = mergeBounds(world.bounds, {
        minX: p.x - 40,
        maxX: p.x + 40,
        minZ: p.z - 40,
        maxZ: p.z + 40,
      });
    }

    // Soft connectors from region fabric toward corridor endpoints (gate continuity).
    const fromOff = cityWorldOffset(spec.from as CityId);
    const toOff = cityWorldOffset(spec.to as CityId);
    const start = spec.points[0];
    const end = spec.points[spec.points.length - 1];
    if (spec.from !== "rural_belt" && spec.from !== "corridor_nm") {
      world.trails.push({
        kind: "village",
        half: spec.halfWidth * 0.85,
        points: [
          { x: fromOff.x + (spec.from === "novapura" ? 400 : 0), z: fromOff.z + 40 },
          start,
        ],
      });
    }
    if (spec.to !== "rural_belt" && spec.to !== "corridor_nm") {
      world.trails.push({
        kind: "village",
        half: spec.halfWidth * 0.85,
        points: [
          end,
          { x: toOff.x - (spec.to === "mandipura" ? 400 : 0), z: toOff.z - 40 },
        ],
      });
    }
  });

  const { spawn, dest } = pickSpawn(world, primaryVillageSpawn, opts)
  world.spawn = spawn;

  // Parked vehicles at spawn for freeroam enter.
  const yaw = spawn.yaw;
  const side = yaw + Math.PI / 2;
  for (let i = 0; i < 3; i += 1) {
    const along = 4 + i * 3.2;
    world.parked.push({
      x: spawn.x + Math.sin(yaw) * along + Math.cos(side) * 2.2,
      z: spawn.z + Math.cos(yaw) * along - Math.sin(side) * 2.2,
      rot: yaw + Math.PI,
      s: 1,
      v: i,
      kind: (i === 0 ? 0 : i === 1 ? 1 : 2) as 0 | 1 | 2,
    });
  }

  // Stash resolved dest on config hubs for HUD/debug (non-breaking).
  world.config = {
    ...world.config,
    hubs: [`dest:${dest.id}`, ...world.config.hubs.filter((h) => !h.startsWith("dest:"))],
  };

  return world;
}

/** True when this CityData was produced by generateWorld (name OMMO). */
export function isWorldData(city: CityData): boolean {
  return city.config.name === "OMMO";
}
