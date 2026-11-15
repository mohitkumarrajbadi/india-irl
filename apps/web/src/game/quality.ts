/**
 * Render / sim budget for a smooth browser experience.
 * Auto picks Low on weak devices and promotes/demotes from measured FPS.
 */
import {
  QUALITY_PRESETS,
  type QualityId,
  type QualitySettings,
  type QualityState,
} from "./quality-presets";

export type { QualityId, QualitySettings, QualityState } from "./quality-presets";
export { QUALITY_PRESETS } from "./quality-presets";

const STORAGE = "india-irl:quality:v1";

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

/** Auto mode: demote if FPS stays low, promote if it stays high. */
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

export function qualityLabel(): string {
  if (quality.preference === "auto") return `Auto (${quality.active.id})`;
  return quality.active.id[0].toUpperCase() + quality.active.id.slice(1);
}
