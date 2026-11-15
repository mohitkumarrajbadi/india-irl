/** localStorage load/save + IST day helpers for vibe. */
import { EMPTY_MISSIONS, type VibeState } from "./vibe-types";

const STORAGE = "india-irl:vibe:v1";

/** IST calendar day — matches the world's clock feel. */
export function istDay(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

export function dayOffset(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00+05:30`);
  const tb = Date.parse(`${b}T00:00:00+05:30`);
  return Math.round((tb - ta) / 86_400_000);
}

export function defaultState(): VibeState {
  return {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastDay: "",
    missions: EMPTY_MISSIONS(),
    sessions: 0,
    lookTweaks: 0,
  };
}

export function loadVibe(): VibeState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Partial<VibeState>;
    const missions = { ...EMPTY_MISSIONS(), ...(p.missions ?? {}) };
    return {
      xp: Math.max(0, Number(p.xp) || 0),
      streak: Math.max(0, Number(p.streak) | 0),
      bestStreak: Math.max(0, Number(p.bestStreak) | 0),
      lastDay: typeof p.lastDay === "string" ? p.lastDay : "",
      missions,
      sessions: Math.max(0, Number(p.sessions) | 0),
      lookTweaks: Math.max(0, Number(p.lookTweaks) | 0),
    };
  } catch {
    return defaultState();
  }
}

export function saveVibe(v: VibeState): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}
