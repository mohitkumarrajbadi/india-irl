import type { CityConfig, DistrictKind, LandmarkSpec, MeetSpec } from "./types-config";

export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Height in meters. Only the camera boom uses it. */
  h?: number;
};

export type Circle = {
  x: number;
  z: number;
  r: number;
};

/** Street extras: fruit, flower, shrine, crane, news, tanker, signal, speed breaker, auto stand. */
export type ExtraKind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Building = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y: number;
  color: number;
  /** 0 concrete flats, 1 glass curtain wall, 2 shopfronts. */
  style: 0 | 1 | 2;
  seed: number;
};

export type Sign = {
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  h: number;
  cell: number;
};

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export type Block = Rect & {
  bi: number;
  bj: number;
  kind: DistrictKind | "landmark" | "lake";
  district: number;
  fringe?: boolean;
};

export type RoadLine = {
  c: number;
  half: number;
  arterial: boolean;
  lanes: number[];
  median: number;
};

/** Dirt village track or asphalt hill climb beyond the city grid. */
export type TrailKind = "village" | "hill";

export type TrailRoad = {
  kind: TrailKind;
  half: number;
  points: { x: number; z: number }[];
};

/** Elevated arterial deck — pillars collide; deck is driveable at deckY. */
export type Flyover = {
  x: number;
  half: number;
  z0: number;
  z1: number;
  deckY: number;
  pillars: { x: number; z: number }[];
};

/**
 * Dipped arterial underpass — travel along `axis`, road centreline at `c`.
 * Floor sits below grade; crossing road stays at ground level overhead.
 */
export type Underpass = {
  axis: "x" | "z";
  c: number;
  half: number;
  a0: number;
  a1: number;
  floorY: number;
  crossC: number;
  crossHalf: number;
};

/** Compact rural cluster outside the urban grid. */
export type VillageSettlement = {
  x: number;
  z: number;
  yaw: number;
  label: string;
  huts: { x: number; z: number; w: number; d: number; h: number; rot: number; color: number }[];
};

export type Prop = { x: number; z: number; rot: number; s: number; v: number };

export type CityData = {
  config: CityConfig;
  xs: number[];
  zs: number[];
  roadsX: RoadLine[];
  roadsZ: RoadLine[];
  blocks: Block[];
  buildings: Building[];
  tanks: { x: number; y: number; z: number }[];
  signs: Sign[];
  billboards: Sign[];
  trees: { x: number; z: number; s: number; color: number }[];
  shrubs: { x: number; z: number; s: number }[];
  lamps: { x: number; z: number; rot: number }[];
  busStops: Prop[];
  stalls: Prop[];
  extras: Prop[];
  cows: Prop[];
  strays: (Prop & { kind: 0 | 1 })[];
  /** kind: 0 bike, 1 auto, 2 cab — enterable freeroam slots. */
  parked: (Prop & { kind: 0 | 1 | 2 })[];
  metroPillars: { x: number; z: number }[];
  metroSegments: { x0: number; z0: number; x1: number; z1: number; station: boolean }[];
  metroLine: { x0: number; z0: number; x1: number; z1: number };
  landmarks: { spec: LandmarkSpec; x: number; z: number; w: number; d: number }[];
  meets: { spec: MeetSpec; x: number; z: number }[];
  lake: Rect | null;
  boxes: Aabb[];
  circles: Circle[];
  /** Village dirt tracks + hill switchbacks draped on the apron. */
  trails: TrailRoad[];
  /** Optional elevated arterial; null if city has no suitable span. */
  flyover: Flyover | null;
  /** Optional dipped underpass; null if no suitable crossing. */
  underpass: Underpass | null;
  /** Rural hamlets along village trails. */
  villages: VillageSettlement[];
  bounds: Rect;
  spawn: { x: number; z: number; yaw: number };
};
