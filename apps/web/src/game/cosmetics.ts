/**
 * Fair cosmetic / garage unlocks gated by vibe level (not pay-to-win).
 * Garage paint applies to scooter tint when driving kind 2.
 */
import { levelInfo, loadVibe } from "./vibe.ts";

const STORAGE = "india-irl:garage:v1";

/** Extra top/paint indices unlocked by level (into TOP_COLORS). */
export const GARAGE_PAINTS = [
  { level: 1, topColor: 0, label: "Sunset orange" },
  { level: 2, topColor: 3, label: "Bay blue" },
  { level: 3, topColor: 4, label: "Chilli red" },
  { level: 4, topColor: 5, label: "Neem green" },
  { level: 5, topColor: 10, label: "Pastel pink" },
  { level: 6, topColor: 9, label: "Mint" },
  { level: 7, topColor: 7, label: "Midnight" },
  { level: 8, topColor: 1, label: "Mustard" },
] as const;

/** Accessory bits unlocked by level (OR into look.acc). */
export const COSMETIC_ACC = [
  { level: 2, bit: 1, label: "Glasses" },
  { level: 3, bit: 8, label: "Headphones" },
  { level: 4, bit: 256, label: "AirPods" },
  { level: 5, bit: 64, label: "Watch" },
  { level: 6, bit: 2, label: "Company ID" },
] as const;

export type GarageState = {
  /** Selected paint index into GARAGE_PAINTS (unlocked only). */
  paint: number;
};

export function loadGarage(): GarageState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { paint: 0 };
    const p = JSON.parse(raw) as { paint?: number };
    return { paint: Math.max(0, Math.min(GARAGE_PAINTS.length - 1, p.paint ?? 0)) };
  } catch {
    return { paint: 0 };
  }
}

export function saveGarage(g: GarageState): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(g));
  } catch {
    /* private */
  }
}

export function unlockedPaints(level = levelInfo(loadVibe().xp).level): typeof GARAGE_PAINTS[number][] {
  return GARAGE_PAINTS.filter((p) => level >= p.level);
}

export function unlockedAccBits(level = levelInfo(loadVibe().xp).level): number {
  let bits = 0;
  for (const a of COSMETIC_ACC) if (level >= a.level) bits |= a.bit;
  return bits;
}

/** Cycle garage paint among unlocked; returns label. */
export function cycleGaragePaint(): string {
  const level = levelInfo(loadVibe().xp).level;
  const unlocked = unlockedPaints(level);
  if (!unlocked.length) return "No paints unlocked yet";
  const g = loadGarage();
  const cur = unlocked.findIndex((p) => p.topColor === GARAGE_PAINTS[g.paint]?.topColor);
  const next = unlocked[(cur + 1 + unlocked.length) % unlocked.length]!;
  const idx = GARAGE_PAINTS.findIndex((p) => p.topColor === next.topColor);
  saveGarage({ paint: Math.max(0, idx) });
  return `Garage · ${next.label}`;
}

/** Top color index for scooter from garage selection (fallback look). */
export function garageTopColor(fallback: number): number {
  const level = levelInfo(loadVibe().xp).level;
  const g = loadGarage();
  const paint = GARAGE_PAINTS[g.paint];
  if (paint && level >= paint.level) return paint.topColor;
  return fallback;
}
