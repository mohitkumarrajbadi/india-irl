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
    shadowRange: 24,
    antialias: false,
    traffic: [4, 5, 5, 1, 1],
    avatarCull: 80,
    avatarShadow: 0,
    nameTag: 26,
    cameraFar: 420,
    fogDensity: 0.0048,
    terrainSeg: 40,
  },
  medium: {
    id: "medium",
    dpr: 1.25,
    shadows: true,
    shadowMap: 1024,
    shadowRange: 32,
    antialias: true,
    traffic: [6, 8, 8, 2, 1],
    avatarCull: 110,
    avatarShadow: 28,
    nameTag: 32,
    cameraFar: 600,
    fogDensity: 0.004,
    terrainSeg: 56,
  },
  high: {
    id: "high",
    dpr: 1.5,
    shadows: true,
    shadowMap: 1536,
    shadowRange: 38,
    antialias: true,
    traffic: [8, 10, 10, 2, 2],
    avatarCull: 140,
    avatarShadow: 36,
    nameTag: 36,
    cameraFar: 760,
    fogDensity: 0.0037,
    terrainSeg: 72,
  },
};

export type QualityState = {
  preference: QualityId;
  active: QualitySettings;
};
