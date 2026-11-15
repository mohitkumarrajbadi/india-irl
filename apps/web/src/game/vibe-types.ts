/** Vibe engagement types + mission catalog. */

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

export type Award = {
  state: VibeState;
  gained: number;
  leveled: boolean;
  title?: string;
  streakUp?: boolean;
  missionDone?: MissionId;
  lucky?: boolean;
};

export const TITLES = [
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
  { id: "emote", label: "Throw a vibe", xp: 12, hint: "Z X C V · B Y U dance" },
  { id: "chat", label: "Say something", xp: 18, hint: "Enter to chat" },
  { id: "hang", label: "Hang near someone", xp: 25, hint: "Get within ~12 m" },
];

export const EMPTY_MISSIONS = (): Record<MissionId, boolean> => ({
  enter: false,
  ride: false,
  emote: false,
  chat: false,
  hang: false,
});
