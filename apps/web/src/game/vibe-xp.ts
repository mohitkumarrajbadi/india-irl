/** XP, levels, streaks, mission completion. */
import { dayOffset, istDay, loadVibe, saveVibe } from "./vibe-persist.ts";
import {
  EMPTY_MISSIONS,
  MISSIONS,
  TITLES,
  type Award,
  type LevelInfo,
  type MissionId,
  type VibeState,
} from "./vibe-types.ts";

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

function rollLucky(): number {
  if (Math.random() < 0.08) return 8 + Math.floor(Math.random() * 12);
  return 0;
}

function gapBonus(prev: VibeState, next: VibeState): number {
  return Math.max(0, next.xp - prev.xp);
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
    if (gap > 1) next.xp += 10;
  }
  saveVibe(next);
  return { state: next, gained: gapBonus(state, next), leveled: false, streakUp };
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
