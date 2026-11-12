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

export type CityId = "bengaluru" | "pune" | "hyderabad" | "gurugram";

export type DistrictKind = "tech" | "cbd" | "resi" | "market" | "old" | "park";

export type LandmarkKind =
  | "vidhana"
  | "ecospace"
  | "shaniwar"
  | "infotechGate"
  | "charminar"
  | "cyberTowers"
  | "cyberHub"
  | "lake";

export type District = {
  name: string;
  kind: DistrictKind;
  /** Inclusive block index ranges. */
  i0: number;
  i1: number;
  j0: number;
  j1: number;
};

export type LandmarkSpec = {
  kind: LandmarkKind;
  bi: number;
  bj: number;
  label: string;
};

/** Named hangout a friend can deep-link into. */
export type MeetSpec = {
  id: string;
  label: string;
  bi: number;
  bj: number;
  blurb: string;
};

export type SkyPalette = {
  /** Fraction of the horizon ring covered by hills, 0 = flat. */
  hills: number;
  hillColor: string;
  haze: string;
};

export type CityConfig = {
  id: CityId;
  name: string;
  tagline: string;
  hubs: string[];
  seed: number;
  cols: number;
  rows: number;
  block: [number, number];
  arterialEvery: number;
  districts: District[];
  landmarks: LandmarkSpec[];
  /** Famous spots to meet friends (deep-link with ?meet=id). */
  meets: MeetSpec[];
  spawn: { bi: number; bj: number };
  metro: { axis: "x" | "z"; index: number; name: string; color: string };
  palette: {
    ground: string;
    paver: string;
    concrete: string[];
    glass: string[];
    old: string[];
    tree: string[];
    bloom: string[];
  };
  livery: { auto: [string, string]; cab: [string, string] };
  shops: string[];
  /** Hiring / city flavour lines painted on tech-park billboards. */
  billboards: string[];
  skyline: SkyPalette;
  cows: number;
  /** Default start-up hour in IST when time is not synced to the clock. */
  startHour: number;
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
};

export type RoadLine = {
  /** Center coordinate of the road across its short axis. */
  c: number;
  half: number;
  arterial: boolean;
  /** Lane offsets from center. */
  lanes: number[];
  median: number;
};

export type Prop = { x: number; z: number; rot: number; s: number; v: number };

export type CityData = {
  config: CityConfig;
  xs: number[];
  zs: number[];
  /** Vertical roads (run along Z) at x = xs[i]. */
  roadsX: RoadLine[];
  /** Horizontal roads (run along X) at z = zs[j]. */
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
  /** City-flavoured street extras. `v` is ExtraKind. */
  extras: Prop[];
  cows: Prop[];
  parked: (Prop & { kind: 0 | 1 })[];
  metroPillars: { x: number; z: number }[];
  /** Station platforms along the line. */
  metroSegments: { x0: number; z0: number; x1: number; z1: number; station: boolean }[];
  metroLine: { x0: number; z0: number; x1: number; z1: number };
  landmarks: { spec: LandmarkSpec; x: number; z: number; w: number; d: number }[];
  meets: { spec: MeetSpec; x: number; z: number }[];
  lake: Rect | null;
  boxes: Aabb[];
  circles: Circle[];
  bounds: Rect;
  spawn: { x: number; z: number; yaw: number };
};
