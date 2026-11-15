import { FOOT } from "@/game/physics";

export const LOOK_SENS = 0.0022;
export const PLAYER_RADIUS = FOOT.radius;
export const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Scratch vectors — reused every frame / cmd, no alloc. */
export const resolveOut = { x: 0, z: 0 };
export const seatScratch = { x: 0, y: 0, z: 0 };
