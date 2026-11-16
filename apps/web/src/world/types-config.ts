export type CityId = "novapura" | "mandipura" | "neerabad" | "udyogabad";

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
  billboards: string[];
  skyline: SkyPalette;
  cows: number;
  dogs: number;
  goats: number;
  startHour: number;
};
