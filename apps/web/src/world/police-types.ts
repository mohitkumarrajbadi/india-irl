export type Cop = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
  state: "patrol" | "respond" | "ticket";
  tx: number;
  tz: number;
  /** performance.now() deadline for ticket linger / patrol retarget. */
  until: number;
  /** Crash event timestamp this cop is answering, or 0. */
  crashAt: number;
};

export const CITY_COPS: Record<string, number> = {
  bengaluru: 5,
  pune: 4,
  hyderabad: 5,
  gurugram: 6,
};
