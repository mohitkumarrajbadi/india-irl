/** Game UI store — profile, HUD, vibe grants. */
export type { Hud } from "./store-core";
export { reportHudFps, toast, useGame } from "./store-core";
export { loadProfile, saveProfile } from "./profile";
export { grantMission, grantXp, syncVibe } from "./store-vibe";
