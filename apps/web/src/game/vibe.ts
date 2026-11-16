/**
 * Local engagement loop: streak, XP, titles, daily missions.
 * Designed for habit + identity investment without a server.
 */
export type { Award, LevelInfo, MissionId, VibeState } from "./vibe-types.ts";
export { MISSIONS } from "./vibe-types.ts";
export { istDay, loadVibe, saveVibe } from "./vibe-persist.ts";
export {
  awardXp,
  buzzLabel,
  completeMission,
  levelInfo,
  missionsDone,
  noteLookTweak,
  noteSession,
  touchStreak,
  xpForLevel,
} from "./vibe-xp.ts";
