/** Stray animal kinds + agent shape for AnimalSim. */

/** 0 cow, 1 dog, 2 goat. */
export type AnimalKind = 0 | 1 | 2;

export type AnimalMood = "roam" | "idle" | "graze" | "flee";

export type Animal = {
  kind: AnimalKind;
  tint: number;
  scale: number;
  x: number;
  z: number;
  /** Cached ground height — refreshed while awake. */
  y: number;
  yaw: number;
  speed: number;
  phase: number;
  mood: AnimalMood;
  moodUntil: number;
  /** Roam waypoint. */
  tx: number;
  tz: number;
  /** Home / spawn anchor — soft leash. */
  hx: number;
  hz: number;
  leash: number;
};

export const ANIMAL_INFO: Record<
  AnimalKind,
  { top: number; accel: number; radius: number; flee: number }
> = {
  0: { top: 1.15, accel: 0.6, radius: 0.95, flee: 2.4 },
  1: { top: 3.6, accel: 4.5, radius: 0.4, flee: 5.5 },
  2: { top: 2.4, accel: 2.8, radius: 0.45, flee: 4.2 },
};
