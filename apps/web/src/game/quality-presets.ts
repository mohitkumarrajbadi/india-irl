/** Quality preset table + types. */

export type QualityId = "auto" | "low" | "medium" | "high";

export type QualitySettings = {
  id: Exclude<QualityId, "auto">;
  dpr: number;
  shadows: boolean;
  shadowMap: number;
  shadowRange: number;
  antialias: boolean;
  /** AI traffic counts: auto, scooter, car, bus, truck. */
  traffic: [number, number, number, number, number];
  avatarCull: number;
  avatarShadow: number;
  nameTag: number;
  cameraFar: number;
  fogDensity: number;
  /** Terrain apron mesh segments (per axis). */
  terrainSeg: number;
};

export const QUALITY_PRESETS: Record<Exclude<QualityId, "auto">, QualitySettings> = {
  low: {
    id: "low",
    dpr: 1,
    shadows: false,
    shadowMap: 512,
    shadowRange: 28,
    antialias: false,
    traffic: [5, 6, 6, 1, 1],
    avatarCull: 90,
    avatarShadow: 0,
    nameTag: 28,
    cameraFar: 520,
    fogDensity: 0.0044,
    terrainSeg: 64,
  },
  medium: {
    id: "medium",
    dpr: 1.35,
    shadows: true,
    shadowMap: 1024,
    shadowRange: 38,
    antialias: true,
    traffic: [8, 10, 10, 2, 2],
    avatarCull: 130,
    avatarShadow: 32,
    nameTag: 34,
    cameraFar: 720,
    fogDensity: 0.0038,
    terrainSeg: 80,
  },
  high: {
    id: "high",
    dpr: 1.75,
    shadows: true,
    shadowMap: 2048,
    shadowRange: 46,
    antialias: true,
    traffic: [10, 14, 14, 3, 3],
    avatarCull: 170,
    avatarShadow: 45,
    nameTag: 38,
    cameraFar: 900,
    fogDensity: 0.0036,
    terrainSeg: 96,
  },
};

export type QualityState = {
  preference: QualityId;
  active: QualitySettings;
};
