import { create } from "zustand";
import { DEFAULT_LOOK, type Look } from "@/avatar/appearance";
import {
  applyQuality,
  cycleQuality,
  loadQualityPreference,
  noteFps,
  quality,
  qualityLabel,
  type QualityId,
} from "@/game/quality";
import { loadVibe, type VibeState } from "@/game/vibe";
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
  /** Arcade vs Rapier step profiler (`?driveProfile=1`). */
  driveProfile?: string;
  /** Active convoy marker line. */
  convoy?: string;
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
  wasted: boolean;
  hud: Hud;
  qualityId: QualityId;
  /** Resolved auto tier for HUD / telemetry. */
  qualityTier: Exclude<QualityId, "auto">;
  meetId: string | null;
  /** OMMO world destination id (spawn within one world; not a map load). */
  destId: string | null;
  joinId: string | null;
  planId: string | null;
  onboardUi: null | "intent" | "comeback";
  vibe: VibeState;
  emoteWheel: boolean;
  mapOpen: boolean;
  setLook: (patch: Partial<Look>) => void;
  setQuality: (id: QualityId) => void;
  cycleQualityPref: () => void;
};

const initialQuality = typeof window !== "undefined" ? loadQualityPreference() : ("auto" as QualityId);
if (typeof window !== "undefined") applyQuality(initialQuality);

const emptyVibe: VibeState = {
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: "",
  missions: { enter: false, ride: false, emote: false, chat: false, hang: false, home: false },
  sessions: 0,
  lookTweaks: 0,
};

export const useGame = create<GameState>((set) => ({
  phase: "menu",
  cityId: "novapura",
  name: "",
  look: DEFAULT_LOOK,
  locked: false,
  chatOpen: false,
  toast: "",
  toastAt: 0,
  wasted: false,
  qualityId: initialQuality,
  qualityTier: quality.active.id,
  meetId: null,
  destId: null,
  joinId: null,
  planId: null,
  onboardUi: null,
  vibe: typeof window !== "undefined" ? loadVibe() : emptyVibe,
  emoteWheel: false,
  mapOpen: false,
  hud: {
    fps: 0, x: 0, z: 0, kmh: 0, heading: "N", district: "", mode: "foot", vehicle: 0, prompt: "", hour: 12, hp: 100,
  },
  setLook: (patch) => set((s) => ({ look: { ...s.look, ...patch } })),
  setQuality: (id) => {
    applyQuality(id);
    set({ qualityId: id, qualityTier: quality.active.id });
    toast(`Graphics: ${qualityLabel()}`);
  },
  cycleQualityPref: () => {
    cycleQuality();
    set({ qualityId: quality.preference, qualityTier: quality.active.id });
    toast(`Graphics: ${qualityLabel()}`);
  },
}));

export function toast(text: string): void {
  useGame.setState({ toast: text, toastAt: performance.now() });
}

export function reportHudFps(fps: number): void {
  const before = quality.active.id;
  noteFps(fps);
  if (quality.active.id !== before) {
    useGame.setState({ qualityTier: quality.active.id });
  }
}
