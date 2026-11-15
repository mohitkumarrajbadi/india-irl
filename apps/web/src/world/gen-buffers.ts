import type {
  Aabb,
  Block,
  Building,
  Circle,
  CityConfig,
  CityData,
  Prop,
  Rect,
  RoadLine,
} from "./types.ts";
import type { Rng } from "../lib/rng.ts";

export type GenBuffers = {
  rng: Rng;
  cfg: CityConfig;
  roadsX: RoadLine[];
  roadsZ: RoadLine[];
  xs: number[];
  zs: number[];
  blocks: Block[];
  buildings: Building[];
  tanks: CityData["tanks"];
  signs: CityData["signs"];
  billboards: CityData["billboards"];
  trees: CityData["trees"];
  shrubs: CityData["shrubs"];
  lamps: CityData["lamps"];
  busStops: CityData["busStops"];
  stalls: CityData["stalls"];
  extras: CityData["extras"];
  cows: CityData["cows"];
  strays: CityData["strays"];
  parked: CityData["parked"];
  boxes: Aabb[];
  circles: Circle[];
  landmarks: CityData["landmarks"];
  lake: Rect | null;
  concrete: number[];
  glass: number[];
  old: number[];
  treeColors: number[];
  bloomColors: number[];
  addTree: (x: number, z: number, big?: number) => void;
};

export function emptyBuffers(cfg: CityConfig, rng: Rng): Omit<
  GenBuffers,
  "roadsX" | "roadsZ" | "xs" | "zs" | "blocks" | "addTree" | "concrete" | "glass" | "old" | "treeColors" | "bloomColors"
> {
  return {
    rng,
    cfg,
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
  };
}

export type StreetProp = Prop;
