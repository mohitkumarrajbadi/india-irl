/** Translate a locally-generated CityData into world space. */
import type { CityData, Rect, TrailRoad, Flyover, Underpass, VillageSettlement } from "./types-data.ts";

function shiftRect(r: Rect, ox: number, oz: number): Rect {
  return { minX: r.minX + ox, maxX: r.maxX + ox, minZ: r.minZ + oz, maxZ: r.maxZ + oz };
}

function shiftTrail(t: TrailRoad, ox: number, oz: number): TrailRoad {
  return { ...t, points: t.points.map((p) => ({ x: p.x + ox, z: p.z + oz })) };
}

function shiftFlyover(f: Flyover | null, ox: number, oz: number): Flyover | null {
  if (!f) return null;
  return {
    ...f,
    x: f.x + ox,
    z0: f.z0 + oz,
    z1: f.z1 + oz,
    pillars: f.pillars.map((p) => ({ x: p.x + ox, z: p.z + oz })),
  };
}

function shiftUnderpass(u: Underpass | null, ox: number, oz: number): Underpass | null {
  if (!u) return null;
  if (u.axis === "x") {
    return { ...u, c: u.c + oz, a0: u.a0 + ox, a1: u.a1 + ox, crossC: u.crossC + oz };
  }
  return { ...u, c: u.c + ox, a0: u.a0 + oz, a1: u.a1 + oz, crossC: u.crossC + ox };
}

function shiftVillage(v: VillageSettlement, ox: number, oz: number): VillageSettlement {
  return {
    ...v,
    x: v.x + ox,
    z: v.z + oz,
    huts: v.huts.map((h) => ({ ...h, x: h.x + ox, z: h.z + oz })),
  };
}

export function offsetCityData(city: CityData, ox: number, oz: number): CityData {
  if (ox === 0 && oz === 0) return city;
  const roadX = city.roadsX.map((r) => ({ ...r, c: r.c + oz }));
  const roadZ = city.roadsZ.map((r) => ({ ...r, c: r.c + ox }));
  return {
    ...city,
    xs: city.xs.map((x) => x + ox),
    zs: city.zs.map((z) => z + oz),
    roadsX: roadX,
    roadsZ: roadZ,
    blocks: city.blocks.map((b) => ({ ...b, ...shiftRect(b, ox, oz) })),
    buildings: city.buildings.map((b) => ({ ...b, x: b.x + ox, z: b.z + oz })),
    tanks: city.tanks.map((t) => ({ ...t, x: t.x + ox, z: t.z + oz })),
    signs: city.signs.map((s) => ({ ...s, x: s.x + ox, z: s.z + oz })),
    billboards: city.billboards.map((s) => ({ ...s, x: s.x + ox, z: s.z + oz })),
    trees: city.trees.map((t) => ({ ...t, x: t.x + ox, z: t.z + oz })),
    shrubs: city.shrubs.map((s) => ({ ...s, x: s.x + ox, z: s.z + oz })),
    lamps: city.lamps.map((l) => ({ ...l, x: l.x + ox, z: l.z + oz })),
    busStops: city.busStops.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    stalls: city.stalls.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    extras: city.extras.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    cows: city.cows.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    strays: city.strays.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    parked: city.parked.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    metroPillars: city.metroPillars.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    metroSegments: city.metroSegments.map((s) => ({
      ...s,
      x0: s.x0 + ox,
      z0: s.z0 + oz,
      x1: s.x1 + ox,
      z1: s.z1 + oz,
    })),
    metroLine: {
      x0: city.metroLine.x0 + ox,
      z0: city.metroLine.z0 + oz,
      x1: city.metroLine.x1 + ox,
      z1: city.metroLine.z1 + oz,
    },
    landmarks: city.landmarks.map((l) => ({ ...l, x: l.x + ox, z: l.z + oz })),
    meets: city.meets.map((m) => ({ ...m, x: m.x + ox, z: m.z + oz })),
    lake: city.lake ? shiftRect(city.lake, ox, oz) : null,
    boxes: city.boxes.map((b) => ({
      ...b,
      minX: b.minX + ox,
      maxX: b.maxX + ox,
      minZ: b.minZ + oz,
      maxZ: b.maxZ + oz,
    })),
    circles: city.circles.map((c) => ({ ...c, x: c.x + ox, z: c.z + oz })),
    trails: city.trails.map((t) => shiftTrail(t, ox, oz)),
    flyover: shiftFlyover(city.flyover, ox, oz),
    underpass: shiftUnderpass(city.underpass, ox, oz),
    villages: city.villages.map((v) => shiftVillage(v, ox, oz)),
    bounds: shiftRect(city.bounds, ox, oz),
    spawn: { ...city.spawn, x: city.spawn.x + ox, z: city.spawn.z + oz },
  };
}

export function mergeBounds(a: Rect, b: Rect): Rect {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minZ: Math.min(a.minZ, b.minZ),
    maxZ: Math.max(a.maxZ, b.maxZ),
  };
}
