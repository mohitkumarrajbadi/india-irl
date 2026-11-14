/**
 * First-session script + guest onboarding persistence.
 * Storage: india-irl:onboard:v1
 */
import { awardXp, levelInfo, loadVibe, saveVibe, xpForLevel, type VibeState } from "./vibe.ts";

export type Intent = "friends" | "dating" | "referrals" | "vibing" | null;

export type OnboardStep =
  | "customize"
  | "enter"
  | "welcome_chai"
  | "easy_job"
  | "wave_prompt"
  | "intent"
  | "comeback_card"
  | "done";

export type OnboardState = {
  version: 1;
  endowed: boolean;
  localTitle: string;
  intent: Intent;
  step: OnboardStep;
  firstEmoteDone: boolean;
  comebackDistrict: string;
};

const STORAGE = "india-irl:onboard:v1";

const DEFAULT: OnboardState = {
  version: 1,
  endowed: false,
  localTitle: "",
  intent: null,
  step: "customize",
  firstEmoteDone: false,
  comebackDistrict: "",
};

export function loadOnboard(): OnboardState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<OnboardState>;
    return {
      version: 1,
      endowed: !!p.endowed,
      localTitle: typeof p.localTitle === "string" ? p.localTitle.slice(0, 40) : "",
      intent:
        p.intent === "friends" || p.intent === "dating" || p.intent === "referrals" || p.intent === "vibing"
          ? p.intent
          : null,
      step: (p.step as OnboardStep) || "customize",
      firstEmoteDone: !!p.firstEmoteDone,
      comebackDistrict: typeof p.comebackDistrict === "string" ? p.comebackDistrict.slice(0, 48) : "",
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveOnboard(s: OnboardState): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

export function patchOnboard(patch: Partial<OnboardState>): OnboardState {
  const next = { ...loadOnboard(), ...patch };
  saveOnboard(next);
  return next;
}

/**
 * One-time endowment so the XP bar sits ~45% into the current level.
 * Returns updated vibe or null if already endowed / not needed.
 */
export function applyEndowment(vibe: VibeState = loadVibe()): { vibe: VibeState; gained: number } | null {
  const board = loadOnboard();
  if (board.endowed) return null;
  const info = levelInfo(vibe.xp);
  const targetInto = Math.floor(info.need * 0.45);
  const need = Math.max(0, targetInto - info.into);
  let next = { ...vibe, missions: { ...vibe.missions } };
  let gained = 0;
  if (need > 0) {
    // Direct XP bump (no lucky roll) so the bar is deterministic.
    next = { ...next, xp: next.xp + need };
    gained = need;
    saveVibe(next);
  }
  patchOnboard({ endowed: true });
  return { vibe: next, gained };
}

/** XP required to sit at ~45% of level 1 bar from zero — for tests. */
export function endowmentTargetXp(): number {
  return Math.floor(xpForLevel(1) * 0.45);
}

export function setLocalTitle(title: string): OnboardState {
  return patchOnboard({ localTitle: title.slice(0, 40) });
}

export function setIntent(intent: Intent): OnboardState {
  return patchOnboard({ intent, step: intent ? "comeback_card" : "intent" });
}

export function advanceStep(step: OnboardStep): OnboardState {
  return patchOnboard({ step });
}

export function markFirstEmote(): OnboardState {
  const board = loadOnboard();
  if (board.firstEmoteDone) return board;
  return patchOnboard({ firstEmoteDone: true, step: board.intent ? board.step : "intent" });
}

export function comebackCopy(district: string): string {
  const place = district || "your plaza";
  return `Come back around 8pm IST when ${place} fills up — same link, no install.`;
}

/** Tiny XP for look tweaks during customize (identity investment). */
export function grantCustomizeDrip(): VibeState {
  return awardXp(2).state;
}
