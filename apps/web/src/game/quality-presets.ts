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

/** Tuned for ~60fps in Chromium on typical laptops. */
export const QUALITY_PRESETS: Record<Exclude<QualityId, "auto">, QualitySettings> = {
  low: {
    id: "low",
    dpr: 1,
    shadows: false,
    shadowMap: 512,
    shadowRange: 20,
    antialias: false,
    traffic: [2, 3, 3, 1, 0],
    avatarCull: 60,
    avatarShadow: 0,
    nameTag: 18,
    cameraFar: 320,
    fogDensity: 0.0056,
    terrainSeg: 28,
  },
  medium: {
    id: "medium",
    dpr: 1,
    shadows: false,
    shadowMap: 1024,
    shadowRange: 26,
    antialias: false,
    traffic: [3, 4, 5, 1, 1],
    avatarCull: 90,
    avatarShadow: 0,
    nameTag: 24,
    cameraFar: 480,
    fogDensity: 0.0046,
    terrainSeg: 40,
  },
  high: {
    id: "high",
    dpr: 1.25,
    shadows: true,
    shadowMap: 1024,
    shadowRange: 30,
    // Keep AA off so switching High↔Medium does not remount the WebGL canvas
    antialias: false,
    traffic: [5, 6, 6, 1, 1],
    avatarCull: 120,
    avatarShadow: 28,
    nameTag: 30,
    cameraFar: 620,
    fogDensity: 0.004,
    terrainSeg: 56,
  },
};

export type QualityState = {
  preference: QualityId;
  active: QualitySettings;
};
