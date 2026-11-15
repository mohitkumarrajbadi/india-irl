import type { DistrictKind, LandmarkKind } from "./types.ts";

export const WALK = 2.6;

export const LANDMARK_FOOTPRINT: Record<LandmarkKind, [number, number]> = {
  vidhana: [56, 34],
  ecospace: [40, 40],
  shaniwar: [46, 46],
  infotechGate: [40, 28],
  charminar: [30, 30],
  cyberTowers: [40, 40],
  cyberHub: [56, 44],
  lake: [0, 0],
};

export type LotStyle = {
  lot: [number, number];
  h: [number, number];
  glass: number;
  setback: [number, number];
  skip: number;
  sign: number;
  trees: number;
};

export const LOTS: Record<Exclude<DistrictKind, "park">, LotStyle> = {
  tech: { lot: [30, 38], h: [26, 92], glass: 0.78, setback: [2, 5], skip: 0.06, sign: 0.12, trees: 0.8 },
  cbd: { lot: [26, 34], h: [48, 150], glass: 0.92, setback: [2, 4], skip: 0.03, sign: 0.08, trees: 0.6 },
  resi: { lot: [17, 24], h: [14, 46], glass: 0.1, setback: [1.5, 4], skip: 0.08, sign: 0.22, trees: 0.7 },
  market: { lot: [9, 14], h: [7, 17], glass: 0, setback: [0.1, 0.4], skip: 0.02, sign: 0.9, trees: 0.3 },
  old: { lot: [10, 15], h: [6, 13], glass: 0, setback: [0.1, 0.5], skip: 0.03, sign: 0.6, trees: 0.2 },
};

export const ARTERIAL_WIDTH = 18;
/** Lane center offsets from road centreline (India LHT — negative = keep-left). */
export const ARTERIAL_LANES = [-2.7, -6.1];
export const MEDIAN = 1.0;
/** Fixed minor-road width so junctions meet cleanly. */
export const MINOR_WIDTH = 9;

export const hex = (s: string) => parseInt(s.slice(1), 16);
