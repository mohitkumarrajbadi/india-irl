import { create } from "zustand";
import { DEFAULT_LOOK, cleanName, decodeLook, encodeLook, type Look } from "@/avatar/appearance";
import {
  applyQuality,
  cycleQuality,
  loadQualityPreference,
  noteFps,
  quality,
  qualityLabel,
  type QualityId,
} from "@/game/quality";
import {
  awardXp,
  completeMission,
  levelInfo,
  loadVibe,
  type MissionId,
  type VibeState,
} from "@/game/vibe";
import type { CityId } from "@/world/types";

export type Hud = {
  fps: number;
  x: number;
  z: number;
  kmh: number;
  heading: string;
  district: string;
  mode: "foot" | "drive" | "passenger";
  vehicle: number;
  prompt: string;
  hour: number;
  /** Soft PvP health 0–100. */
  hp: number;
};

type GameState = {
  phase: "menu" | "playing";
  cityId: CityId;
  name: string;
  look: Look;
  locked: boolean;
  chatOpen: boolean;
  toast: string;
  toastAt: number;
  /** KHATAM death overlay (set once on enter/exit — not per frame). */
  wasted: boolean;
  hud: Hud;
  /** Render budget preference. Changing it remounts the Canvas. */
  qualityId: QualityId;
  /** Optional hangout id from ?meet= — overrides spawn when entering. */
  meetId: string | null;
  /** Deep-link: land next to this peer when possible. */
  joinId: string | null;
  /** Deep-link plan id (?plan=). */
  planId: string | null;
  /** First-session overlays. */
  onboardUi: null | "intent" | "comeback";
  /** Highlight Delivery chip during scripted first session. */
  highlightJob: boolean;
  /** Local streak / XP / missions — dopamine loop. */
  vibe: VibeState;
  /** Hold-Tab emote radial. */
  emoteWheel: boolean;
  /** Fullscreen city map preview. */
  mapOpen: boolean;
  setLook: (patch: Partial<Look>) => void;
  setQuality: (id: QualityId) => void;
  cycleQualityPref: () => void;
};

const STORAGE = "india-irl:profile:v1";

export function loadProfile(): { name: string; look: Look; city: CityId } | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    const p = JSON.parse(raw) as { name?: string; look?: unknown; city?: string };
    const city: CityId = p.city === "pune" || p.city === "hyderabad" || p.city === "gurugram" ? p.city : "bengaluru";
    return { name: cleanName(p.name ?? ""), look: decodeLook(p.look), city };
  } catch {
    return null;
  }
}

export function saveProfile(name: string, look: Look, city: CityId): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ name, look: encodeLook(look), city }));
  } catch {
    /* private mode: fine, just don't persist */
  }
}

const initialQuality = typeof window !== "undefined" ? loadQualityPreference() : ("high" as QualityId);
if (typeof window !== "undefined") applyQuality(initialQuality);

export const useGame = create<GameState>((set) => ({
  phase: "menu",
  cityId: "bengaluru",
  name: "",
  look: DEFAULT_LOOK,
  locked: false,
  chatOpen: false,
  toast: "",
  toastAt: 0,
  wasted: false,
  qualityId: initialQuality,
  meetId: null,
  vibe: typeof window !== "undefined" ? loadVibe() : { xp: 0, streak: 0, bestStreak: 0, lastDay: "", missions: { enter: false, ride: false, emote: false, chat: false, hang: false }, sessions: 0, lookTweaks: 0 },
  /** Deep-link: land next to this peer id when possible. */
  joinId: null as string | null,
  /** Deep-link plan id (?plan=). */
  planId: null as string | null,
  /** First-session UI: show intent picker / comeback card. */
  onboardUi: null as null | "intent" | "comeback",
  /** Highlight Delivery job chip during scripted first session. */
  highlightJob: false,
  emoteWheel: false,
  mapOpen: false,
  hud: {
    fps: 0, x: 0, z: 0, kmh: 0, heading: "N", district: "", mode: "foot", vehicle: 0, prompt: "", hour: 12, hp: 100,
  },
  setLook: (patch) => set((s) => ({ look: { ...s.look, ...patch } })),
  setQuality: (id) => {
    applyQuality(id);
    set({ qualityId: id });
    toast(`Graphics: ${qualityLabel()}`);
  },
  cycleQualityPref: () => {
    cycleQuality();
    set({ qualityId: quality.preference });
    toast(`Graphics: ${qualityLabel()}`);
  },
}));

export function toast(text: string): void {
  useGame.setState({ toast: text, toastAt: performance.now() });
}

export function reportHudFps(fps: number): void {
  noteFps(fps);
}

/** Complete a daily mission if fresh; toast + sync store. */
export function grantMission(id: MissionId): void {
  const award = completeMission(id);
  if (!award) return;
  useGame.setState({ vibe: award.state });
  const meta = levelInfo(award.state.xp);
  if (award.leveled) toast(`Level ${meta.level} · ${award.title}`);
  else if (award.lucky) toast(`Lucky chai · +${award.gained} vibe`);
  else toast(`+${award.gained} vibe`);
}

export function syncVibe(): void {
  useGame.setState({ vibe: loadVibe() });
}

/** Raw XP drip for jobs / bonuses (not daily missions). */
export function grantXp(amount: number, label: string): void {
  const award = awardXp(amount);
  useGame.setState({ vibe: award.state });
  const meta = levelInfo(award.state.xp);
  if (award.leveled) toast(`${label} · Level ${meta.level} · ${award.title}`);
  else if (award.lucky) toast(`${label} · lucky +${award.gained} vibe`);
  else toast(`${label} · +${award.gained} vibe`);
}
