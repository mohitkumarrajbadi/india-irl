/**
 * Deterministic OMMO world geography — one connected landmass.
 * Coordinates are meters; city packs are authored at local origin then offset.
 */
import type { CityId } from "./types-config.ts";

export const WORLD_SEED = 20261115;
export const WORLD_ID = "ommo" as const;

export type RegionId = CityId | "rural_belt" | "corridor_nm";

export type Vec2 = { x: number; z: number };

export type RegionAnchor = {
  id: RegionId;
  label: string;
  /** World-space center of the region pack. */
  center: Vec2;
  /** Approximate half-extent used for corridor docking (m). */
  halfExtent: Vec2;
  kind: "metro" | "industrial" | "coastal" | "rural" | "corridor";
};

export type CorridorSpec = {
  id: string;
  from: RegionId;
  to: RegionId;
  /** World-space polyline control points (highway centerline). */
  points: Vec2[];
  halfWidth: number;
  villageAt?: number;
};

export type DestinationKind = "city" | "district" | "scenic" | "social" | "village";

export type WorldDestination = {
  id: string;
  label: string;
  kind: DestinationKind;
  /** Owning city region for deep-link `?city=` aliases. */
  cityId: CityId;
  /** Meet id when this destination maps to a plaza; null for scenic/highway. */
  meetId: string | null;
  /** World-space spawn (filled after generation for dynamic meets; static for authored scenic). */
  x: number;
  z: number;
  yaw: number;
  blurb: string;
  featured?: boolean;
};

/** Layout: Novapura west, Mandipura ~6 km ENE, Neerabad south lakeside, Udyogabad NW industrial. */
export const REGION_ANCHORS: RegionAnchor[] = [
  {
    id: "novapura",
    label: "Novapura metropolitan region",
    center: { x: 0, z: 0 },
    halfExtent: { x: 520, z: 480 },
    kind: "metro",
  },
  {
    id: "mandipura",
    label: "Mandipura hills & markets",
    center: { x: 6200, z: 900 },
    halfExtent: { x: 480, z: 560 },
    kind: "metro",
  },
  {
    id: "neerabad",
    label: "Neerabad pearl shore",
    center: { x: 1800, z: 5200 },
    halfExtent: { x: 520, z: 520 },
    kind: "coastal",
  },
  {
    id: "udyogabad",
    label: "Udyogabad glass corridor",
    center: { x: -4800, z: 2200 },
    halfExtent: { x: 540, z: 520 },
    kind: "industrial",
  },
  {
    id: "rural_belt",
    label: "Rural & mountain belt",
    center: { x: 3200, z: -2800 },
    halfExtent: { x: 1800, z: 1200 },
    kind: "rural",
  },
  {
    id: "corridor_nm",
    label: "Novapura–Mandipura highway",
    center: { x: 3100, z: 450 },
    halfExtent: { x: 2800, z: 200 },
    kind: "corridor",
  },
];

export function regionAnchor(id: RegionId): RegionAnchor {
  const a = REGION_ANCHORS.find((r) => r.id === id);
  if (!a) throw new Error(`unknown region ${id}`);
  return a;
}

/** World offset applied to a city pack generated at local origin. */
export function cityWorldOffset(cityId: CityId): Vec2 {
  const a = regionAnchor(cityId);
  return { x: a.center.x, z: a.center.z };
}

/**
 * Highway Novapura east fringe → Mandipura west fringe with a mid village kink.
 * Dock points use region half-extents so roads meet urban envelopes.
 */
export function corridorNovapuraMandipura(): CorridorSpec {
  const novo = regionAnchor("novapura");
  const mandi = regionAnchor("mandipura");
  const start = { x: novo.center.x + novo.halfExtent.x + 40, z: novo.center.z + 40 };
  const mid = { x: (novo.center.x + mandi.center.x) / 2, z: (novo.center.z + mandi.center.z) / 2 + 120 };
  const end = { x: mandi.center.x - mandi.halfExtent.x - 40, z: mandi.center.z - 60 };
  return {
    id: "hwy-novapura-mandipura",
    from: "novapura",
    to: "mandipura",
    points: [
      start,
      { x: start.x + 800, z: start.z + 80 },
      mid,
      { x: end.x - 700, z: end.z - 40 },
      end,
    ],
    halfWidth: 12,
    villageAt: 0.48,
  };
}

export function corridorNovapuraNeerabad(): CorridorSpec {
  const novo = regionAnchor("novapura");
  const neer = regionAnchor("neerabad");
  return {
    id: "hwy-novapura-neerabad",
    from: "novapura",
    to: "neerabad",
    points: [
      { x: novo.center.x + 120, z: novo.center.z + novo.halfExtent.z + 40 },
      { x: 600, z: 1800 },
      { x: 1200, z: 3400 },
      { x: neer.center.x - 80, z: neer.center.z - neer.halfExtent.z - 40 },
    ],
    halfWidth: 11,
    villageAt: 0.4,
  };
}

export function corridorNovapuraUdyogabad(): CorridorSpec {
  const novo = regionAnchor("novapura");
  const udy = regionAnchor("udyogabad");
  return {
    id: "hwy-novapura-udyogabad",
    from: "novapura",
    to: "udyogabad",
    points: [
      { x: novo.center.x - novo.halfExtent.x - 40, z: novo.center.z + 100 },
      { x: -1800, z: 800 },
      { x: -3200, z: 1600 },
      { x: udy.center.x + udy.halfExtent.x + 40, z: udy.center.z - 40 },
    ],
    halfWidth: 12,
    villageAt: 0.55,
  };
}

export function corridorMandipuraRural(): CorridorSpec {
  const mandi = regionAnchor("mandipura");
  const rural = regionAnchor("rural_belt");
  return {
    id: "road-mandipura-rural",
    from: "mandipura",
    to: "rural_belt",
    points: [
      { x: mandi.center.x + 40, z: mandi.center.z - mandi.halfExtent.z - 40 },
      { x: 4000, z: -400 },
      { x: rural.center.x, z: rural.center.z + 400 },
    ],
    halfWidth: 7,
    villageAt: 0.6,
  };
}

/** Prototype: Novapura ↔ Mandipura only. */
export function prototypeCorridors(): CorridorSpec[] {
  return [corridorNovapuraMandipura()];
}

/** Full connected landmass corridors. */
export function fullCorridors(): CorridorSpec[] {
  return [
    corridorNovapuraMandipura(),
    corridorNovapuraNeerabad(),
    corridorNovapuraUdyogabad(),
    corridorMandipuraRural(),
  ];
}

/** Authored scenic / social destinations (world space). Meets fill dynamically after gen. */
export const STATIC_DESTINATIONS: WorldDestination[] = [
  {
    id: "novapura-central",
    label: "Novapura Central",
    kind: "city",
    cityId: "novapura",
    meetId: "kaapi-block",
    x: 0,
    z: 0,
    yaw: Math.PI / 2,
    blurb: "Campus capital — filter kaapi and towers.",
    featured: true,
  },
  {
    id: "campus-district",
    label: "Campus District",
    kind: "district",
    cityId: "novapura",
    meetId: "campus-lawn",
    x: 0,
    z: 0,
    yaw: 0,
    blurb: "Tech park lawns on the outer ring.",
    featured: true,
  },
  {
    id: "mandipura-market",
    label: "Market District",
    kind: "city",
    cityId: "mandipura",
    meetId: "book-street",
    x: 6200,
    z: 900,
    yaw: Math.PI / 2,
    blurb: "Book Street cafes and crowded gallis.",
    featured: true,
  },
  {
    id: "highway-dhaba",
    label: "Highway Dhaba",
    kind: "social",
    cityId: "novapura",
    meetId: null,
    x: 3100,
    z: 570,
    yaw: 0,
    blurb: "Midway chai stop on the Novapura–Mandipura highway.",
    featured: true,
  },
  {
    id: "pearl-shore",
    label: "Pearl Shore",
    kind: "city",
    cityId: "neerabad",
    meetId: null,
    x: 1800,
    z: 5200,
    yaw: 0,
    blurb: "Lakeside promenade (expanded in Phase 3).",
  },
  {
    id: "glass-corridor",
    label: "Glass Corridor",
    kind: "city",
    cityId: "udyogabad",
    meetId: null,
    x: -4800,
    z: 2200,
    yaw: 0,
    blurb: "Industrial & corporate spine (expanded in Phase 3).",
  },
  {
    id: "mountain-viewpoint",
    label: "Mountain Viewpoint",
    kind: "scenic",
    cityId: "novapura",
    meetId: null,
    x: 3200,
    z: -2800,
    yaw: Math.PI,
    blurb: "Hairpins and mist over the rural belt.",
  },
  {
    id: "village-square",
    label: "Village Square",
    kind: "village",
    cityId: "novapura",
    meetId: null,
    x: 3100,
    z: 570,
    yaw: Math.PI / 4,
    blurb: "Tea stall and cricket dust beside the highway.",
    featured: true,
  },
];

export function destinationsForMenu(): WorldDestination[] {
  return STATIC_DESTINATIONS;
}

export function resolveDestination(id: string | null | undefined): WorldDestination {
  const found = STATIC_DESTINATIONS.find((d) => d.id === id);
  return found ?? STATIC_DESTINATIONS[0];
}

export function destinationFromCityMeet(cityId: CityId, meetId: string | null): WorldDestination {
  const hit = STATIC_DESTINATIONS.find((d) => d.cityId === cityId && (meetId ? d.meetId === meetId : d.kind === "city"));
  if (hit) return hit;
  const city = STATIC_DESTINATIONS.find((d) => d.cityId === cityId && d.kind === "city");
  return city ?? STATIC_DESTINATIONS[0];
}
