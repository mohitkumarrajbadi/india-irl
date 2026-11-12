/**
 * Local engagement loop: streak, XP, titles, daily missions.
 * Designed for habit + identity investment without a server.
 */

export type MissionId = "enter" | "ride" | "emote" | "chat" | "hang";

export type VibeState = {
  xp: number;
  streak: number;
  bestStreak: number;
  lastDay: string;
  /** Missions completed today. */
  missions: Record<MissionId, boolean>;
  sessions: number;
  /** Cumulative look tweaks — sunk-cost identity. */
  lookTweaks: number;
};

export type LevelInfo = {
  level: number;
  title: string;
  into: number;
  need: number;
  progress: number;
};

const STORAGE = "india-irl:vibe:v1";

const TITLES = [
  "New in town",
  "Cafe regular",
  "Office legend",
  "Peak-hour pro",
  "City vibe",
  "Night owl",
  "Main character",
  "IRL icon",
  "Desi deity",
] as const;

export const MISSIONS: { id: MissionId; label: string; xp: number; hint: string }[] = [
  { id: "enter", label: "Step into a city", xp: 15, hint: "Hit Enter" },
  { id: "ride", label: "Take a ride", xp: 20, hint: "1 / 2 / 3 or hop on" },
  { id: "emote", label: "Throw a vibe", xp: 12, hint: "Z X C V" },
  { id: "chat", label: "Say something", xp: 18, hint: "Enter to chat" },
  { id: "hang", label: "Hang near someone", xp: 25, hint: "Get within ~12 m" },
];

const EMPTY_MISSIONS = (): Record<MissionId, boolean> => ({
  enter: false,
  ride: false,
  emote: false,
  chat: false,
  hang: false,
});

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

function dayOffset(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00+05:30`);
  const tb = Date.parse(`${b}T00:00:00+05:30`);
  return Math.round((tb - ta) / 86_400_000);
}

function defaultState(): VibeState {
  return {
    // Start near-empty; onboarding.applyEndowment fills ~45% of level 1 once.
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

/** XP needed to clear a level (into next). Soft curve keeps early wins frequent. */
export function xpForLevel(level: number): number {
  return 36 + Math.max(0, level - 1) * 22;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  let rem = Math.max(0, xp);
  let need = xpForLevel(1);
  while (rem >= need && level < TITLES.length) {
    rem -= need;
    level += 1;
    need = xpForLevel(level);
  }
  if (level >= TITLES.length) {
    return { level: TITLES.length, title: TITLES[TITLES.length - 1], into: need, need, progress: 1 };
  }
  return {
    level,
    title: TITLES[level - 1],
    into: rem,
    need,
    progress: Math.min(1, rem / need),
  };
}

export type Award = {
  state: VibeState;
  gained: number;
  leveled: boolean;
  title?: string;
  streakUp?: boolean;
  missionDone?: MissionId;
  lucky?: boolean;
};

function rollLucky(): number {
  // Variable ratio schedule — rare surprise boosts.
  if (Math.random() < 0.08) return 8 + Math.floor(Math.random() * 12);
  return 0;
}

/** Call once when opening the menu / entering a session day. */
export function touchStreak(state: VibeState = loadVibe()): Award {
  const today = istDay();
  const next = { ...state, missions: { ...state.missions } };
  let streakUp = false;
  if (next.lastDay !== today) {
    const gap = next.lastDay ? dayOffset(next.lastDay, today) : 999;
    if (gap === 1) {
      next.streak += 1;
      streakUp = true;
    } else if (gap > 1 || !next.lastDay) {
      next.streak = 1;
      streakUp = true;
    }
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.lastDay = today;
    next.missions = EMPTY_MISSIONS();
    // Soft recovery: returning after a break still gets a welcome drip.
    if (gap > 1) next.xp += 10;
  }
  saveVibe(next);
  return { state: next, gained: gapBonus(state, next), leveled: false, streakUp };
}

function gapBonus(prev: VibeState, next: VibeState): number {
  return Math.max(0, next.xp - prev.xp);
}

export function awardXp(amount: number, state: VibeState = loadVibe()): Award {
  const before = levelInfo(state.xp);
  const lucky = rollLucky();
  const gained = amount + lucky;
  const next = { ...state, missions: { ...state.missions }, xp: state.xp + gained };
  const after = levelInfo(next.xp);
  saveVibe(next);
  return {
    state: next,
    gained,
    leveled: after.level > before.level,
    title: after.level > before.level ? after.title : undefined,
    lucky: lucky > 0,
  };
}

export function completeMission(id: MissionId, state: VibeState = loadVibe()): Award | null {
  touchStreak(state);
  const fresh = loadVibe();
  if (fresh.missions[id]) return null;
  const meta = MISSIONS.find((m) => m.id === id)!;
  const next = {
    ...fresh,
    missions: { ...fresh.missions, [id]: true },
  };
  saveVibe(next);
  const award = awardXp(meta.xp, next);
  return { ...award, missionDone: id };
}

export function noteSession(state: VibeState = loadVibe()): VibeState {
  const next = { ...state, sessions: state.sessions + 1, missions: { ...state.missions } };
  saveVibe(next);
  return next;
}

export function noteLookTweak(state: VibeState = loadVibe()): VibeState {
  const next = { ...state, lookTweaks: state.lookTweaks + 1, missions: { ...state.missions } };
  // Tiny drip every few tweaks — customization = sunk cost.
  if (next.lookTweaks % 5 === 0) next.xp += 3;
  saveVibe(next);
  return next;
}

export function missionsDone(v: VibeState): number {
  return MISSIONS.filter((m) => v.missions[m.id]).length;
}

export function buzzLabel(online: number): string {
  if (online >= 12) return "Packed right now";
  if (online >= 5) return "Warming up";
  if (online >= 2) return "Friends dropping in";
  if (online === 1) return "One soul online — join them";
  return "Be first in tonight";
}
