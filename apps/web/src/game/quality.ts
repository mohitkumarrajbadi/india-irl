/**
 * Render / sim budget for a smooth browser experience.
 * Auto picks Low first and promotes/demotes from measured FPS.
 */
import {
  QUALITY_PRESETS,
  type QualityId,
  type QualitySettings,
  type QualityState,
} from "./quality-presets";

export type { QualityId, QualitySettings, QualityState } from "./quality-presets";
export { QUALITY_PRESETS } from "./quality-presets";

/** v3 — low-end-first budgets after dense 12-type fleet. */
const STORAGE = "india-irl:quality:v3";
const LEGACY = "india-irl:quality:v2";

/** Hysteresis so auto mode does not thrash every sample. */
let lowStreak = 0;
let highStreak = 0;

function weakDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  const touch = navigator.maxTouchPoints > 0;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (mem !== undefined && mem <= 4) return true;
  if (cores <= 4 && touch) return true;
  if (touch && dpr >= 2.5) return true;
  if (cores <= 4) return true;
  return false;
}

export function detectDefaultPreference(): QualityId {
  return "auto";
}

export function resolveQuality(preference: QualityId, hint?: Exclude<QualityId, "auto">): QualitySettings {
  if (preference === "auto") {
    if (hint) return QUALITY_PRESETS[hint];
    // Always boot low — promote after solid FPS so phones stay smooth
    return QUALITY_PRESETS.low;
  }
  return QUALITY_PRESETS[preference];
}

export function loadQualityPreference(): QualityId {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw === "low" || raw === "medium" || raw === "high" || raw === "auto") return raw;
    // Migrate v1: locked High/Medium → auto so FPS can recover
    const legacy = localStorage.getItem(LEGACY);
    if (legacy) {
      localStorage.removeItem(LEGACY);
      if (legacy === "low") return "low";
      return "auto";
    }
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
  preference: "auto",
  active: QUALITY_PRESETS.low,
};

export function applyQuality(preference: QualityId, hint?: Exclude<QualityId, "auto">): QualitySettings {
  quality.preference = preference;
  quality.active = resolveQuality(preference, hint);
  lowStreak = 0;
  highStreak = 0;
  saveQualityPreference(preference);
  return quality.active;
}

export function cycleQuality(): QualitySettings {
  const order: QualityId[] = ["auto", "low", "medium", "high"];
  const i = order.indexOf(quality.preference);
  return applyQuality(order[(i + 1) % order.length]);
}

/**
 * Auto mode: demote under ~52fps, promote only when solidly near 60.
 * Locked High/Medium still emergency-demotes the active tier when drowning.
 */
export function noteFps(fps: number): void {
  if (quality.preference !== "auto") {
    if (fps > 0 && fps < 42 && quality.active.id !== "low") {
      lowStreak += 1;
      highStreak = 0;
      if (lowStreak >= 3) {
        lowStreak = 0;
        quality.active =
          quality.active.id === "high" ? QUALITY_PRESETS.medium : QUALITY_PRESETS.low;
      }
    } else {
      lowStreak = 0;
    }
    return;
  }

  const cur = quality.active.id;
  if (fps > 0 && fps < 52) {
    lowStreak += 1;
    highStreak = 0;
    if (lowStreak >= 2) {
      lowStreak = 0;
      if (cur === "high") quality.active = QUALITY_PRESETS.medium;
      else if (cur === "medium") quality.active = QUALITY_PRESETS.low;
    }
  } else if (fps >= 55) {
    highStreak += 1;
    lowStreak = 0;
    if (highStreak >= 4) {
      highStreak = 0;
      // Cap auto at medium — high is manual-only to avoid Canvas remount thrash
      if (cur === "low") quality.active = QUALITY_PRESETS.medium;
    }
  } else {
    lowStreak = 0;
    highStreak = 0;
  }
}

export function qualityLabel(): string {
  if (quality.preference === "auto") return `Auto (${quality.active.id})`;
  return quality.active.id[0].toUpperCase() + quality.active.id.slice(1);
}
