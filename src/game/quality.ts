/**
 * Render / sim budget for a smooth browser experience.
 * Auto picks Low on weak devices and promotes/demotes from measured FPS.
 */
export type QualityId = "auto" | "low" | "medium" | "high";

export type QualitySettings = {
  id: Exclude<QualityId, "auto">;
  /** Max device pixel ratio. */
  dpr: number;
  shadows: boolean;
  shadowMap: number;
  shadowRange: number;
  antialias: boolean;
  /** AI traffic counts: auto, scooter, car, bus, truck. */
  traffic: [number, number, number, number, number];
  /** Hide remote avatars beyond this distance (m). */
  avatarCull: number;
  /** Cast avatar shadows within this distance (m). */
  avatarShadow: number;
  /** Show name tags within this distance (m). */
  nameTag: number;
  /** Camera far plane. */
  cameraFar: number;
  fogDensity: number;
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
  },
};

const STORAGE = "india-irl:quality:v1";

export type QualityState = {
  preference: QualityId;
  /** Resolved preset currently applied. */
  active: QualitySettings;
};

function weakDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  const touch = navigator.maxTouchPoints > 0;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (mem !== undefined && mem <= 4) return true;
  if (cores <= 4 && touch) return true;
  if (touch && dpr >= 2.5) return true;
  return false;
}

export function detectDefaultPreference(): QualityId {
  return weakDevice() ? "auto" : "high";
}

export function resolveQuality(preference: QualityId, hint?: Exclude<QualityId, "auto">): QualitySettings {
  if (preference === "auto") {
    if (hint) return QUALITY_PRESETS[hint];
    return QUALITY_PRESETS[weakDevice() ? "low" : "medium"];
  }
  return QUALITY_PRESETS[preference];
}

export function loadQualityPreference(): QualityId {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw === "low" || raw === "medium" || raw === "high" || raw === "auto") return raw;
  } catch {
    /* ignore */
  }
  return detectDefaultPreference();
}

export function saveQualityPreference(id: QualityId): void {
  try {
    localStorage.setItem(STORAGE, id);
  } catch {
    /* ignore */
  }
}

/** Mutable singleton read every frame by Atmosphere / Actor / Traffic. */
export const quality: QualityState = {
  preference: "high",
  active: QUALITY_PRESETS.high,
};

export function applyQuality(preference: QualityId, hint?: Exclude<QualityId, "auto">): QualitySettings {
  quality.preference = preference;
  quality.active = resolveQuality(preference, hint);
  saveQualityPreference(preference);
  return quality.active;
}

export function cycleQuality(): QualitySettings {
  const order: QualityId[] = ["auto", "low", "medium", "high"];
  const i = order.indexOf(quality.preference);
  return applyQuality(order[(i + 1) % order.length]);
}

/**
 * Auto mode: demote if FPS stays low, promote if it stays high.
 * Call ~4 Hz from the HUD sample path.
 */
export function noteFps(fps: number): void {
  if (quality.preference !== "auto") return;
  const cur = quality.active.id;
  if (fps > 0 && fps < 36) {
    if (cur === "high") quality.active = QUALITY_PRESETS.medium;
    else if (cur === "medium") quality.active = QUALITY_PRESETS.low;
  } else if (fps >= 56) {
    if (cur === "low") quality.active = QUALITY_PRESETS.medium;
    else if (cur === "medium" && !weakDevice()) quality.active = QUALITY_PRESETS.high;
  }
}

/** Human label for toasts / HUD. */
export function qualityLabel(): string {
  if (quality.preference === "auto") return `Auto (${quality.active.id})`;
  return quality.active.id[0].toUpperCase() + quality.active.id.slice(1);
}
