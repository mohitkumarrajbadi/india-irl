/** Quality preset table + types. */

export type QualityId = "auto" | "low" | "medium" | "high";

export type QualitySettings = {
  id: Exclude<QualityId, "auto">;
  dpr: number;
  shadows: boolean;
  shadowMap: number;
  shadowRange: number;
  antialias: boolean;
  /**
   * AI traffic counts (12):
   * auto, scooter, hatch, bus, truck, motorcycle, SUV, tempo, van, jeep, taxi, e-rickshaw
   */
  traffic: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  /** Max simultaneous traffic headlight beams. */
  trafficBeams: 2 | 4 | 6;
  avatarCull: number;
  avatarShadow: number;
  nameTag: number;
  cameraFar: number;
  fogDensity: number;
  /** Terrain apron mesh segments (per axis). */
  terrainSeg: number;
  /** Ped / animal interest scale 0.45…1. */
  lifeScale: number;
};

/**
 * Low = phone / weak laptop: sharp look, cheap cost.
 * Medium / High add shadows, AA, denser fleet.
 */
export const QUALITY_PRESETS: Record<Exclude<QualityId, "auto">, QualitySettings> = {
  low: {
    id: "low",
    dpr: 1,
    shadows: false,
    shadowMap: 512,
    shadowRange: 18,
    antialias: false,
    // 28 vehicles — every type present, clustered near player via nearby seed
    traffic: [3, 4, 4, 1, 1, 3, 2, 1, 2, 2, 2, 3],
    trafficBeams: 2,
    avatarCull: 48,
    avatarShadow: 0,
    nameTag: 16,
    cameraFar: 280,
    fogDensity: 0.0054,
    terrainSeg: 24,
    lifeScale: 0.55,
  },
  medium: {
    id: "medium",
    dpr: 1.1,
    shadows: false,
    shadowMap: 1024,
    shadowRange: 24,
    antialias: false,
    traffic: [4, 6, 7, 2, 2, 4, 3, 2, 2, 2, 3, 3],
    trafficBeams: 4,
    avatarCull: 80,
    avatarShadow: 0,
    nameTag: 22,
    cameraFar: 420,
    fogDensity: 0.0044,
    terrainSeg: 36,
    lifeScale: 0.8,
  },
  high: {
    id: "high",
    dpr: 1.25,
    shadows: true,
    shadowMap: 1024,
    shadowRange: 30,
    antialias: true,
    traffic: [6, 8, 10, 2, 2, 5, 4, 3, 3, 3, 4, 4],
    trafficBeams: 6,
    avatarCull: 110,
    avatarShadow: 24,
    nameTag: 28,
    cameraFar: 560,
    fogDensity: 0.0036,
    terrainSeg: 48,
    lifeScale: 1,
  },
};

export type QualityState = {
  preference: QualityId;
  active: QualitySettings;
};
