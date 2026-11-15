/** Destructible roadside prop definitions — health, thresholds, break modes. */

export type BreakMode = "shatter" | "scatter" | "bend" | "tip";
export type DestMaterial = "wood" | "plastic" | "metal" | "organic";
export type DestSource = "stall" | "extra" | "lamp" | "tree" | "shrub";

export type DestDef = {
  hp: number;
  /** Min |vehicle speed| (m/s) to apply damage. */
  breakSpeed: number;
  /** Impulse scale vs vehicle mass. */
  toughness: number;
  mode: BreakMode;
  material: DestMaterial;
  radius: number;
  /** Soft mass for push reaction on the vehicle. */
  mass: number;
  label: string;
};

/** Chai / veg stalls. */
export const STALL_DEF: DestDef = {
  hp: 28,
  breakSpeed: 3.5,
  toughness: 0.9,
  mode: "scatter",
  material: "wood",
  radius: 1.15,
  mass: 80,
  label: "Stall",
};

/** Extra kinds: fruit, flower, shrine, crane*, news, tanker*, signal, breaker*, stand. */
export const EXTRA_DEFS: Partial<Record<number, DestDef>> = {
  0: {
    hp: 22,
    breakSpeed: 3,
    toughness: 0.75,
    mode: "scatter",
    material: "wood",
    radius: 1.0,
    mass: 55,
    label: "Fruit cart",
  },
  1: {
    hp: 18,
    breakSpeed: 3,
    toughness: 0.7,
    mode: "scatter",
    material: "wood",
    radius: 0.95,
    mass: 45,
    label: "Flower cart",
  },
  2: {
    hp: 55,
    breakSpeed: 7,
    toughness: 1.4,
    mode: "tip",
    material: "wood",
    radius: 0.9,
    mass: 120,
    label: "Shrine",
  },
  4: {
    hp: 30,
    breakSpeed: 4,
    toughness: 0.95,
    mode: "shatter",
    material: "plastic",
    radius: 1.0,
    mass: 70,
    label: "News stand",
  },
  6: {
    hp: 70,
    breakSpeed: 8,
    toughness: 1.6,
    mode: "bend",
    material: "metal",
    radius: 0.7,
    mass: 180,
    label: "Signal",
  },
  8: {
    hp: 40,
    breakSpeed: 5,
    toughness: 1.1,
    mode: "shatter",
    material: "plastic",
    radius: 1.15,
    mass: 90,
    label: "Auto stand",
  },
};

export const LAMP_DEF: DestDef = {
  hp: 48,
  breakSpeed: 6,
  toughness: 1.35,
  mode: "bend",
  material: "metal",
  radius: 0.55,
  mass: 140,
  label: "Streetlight",
};

export const TREE_DEF: DestDef = {
  hp: 90,
  breakSpeed: 10,
  toughness: 2.0,
  mode: "tip",
  material: "organic",
  radius: 0.7,
  mass: 400,
  label: "Tree",
};

export const SHRUB_DEF: DestDef = {
  hp: 12,
  breakSpeed: 2.5,
  toughness: 0.45,
  mode: "shatter",
  material: "organic",
  radius: 0.55,
  mass: 25,
  label: "Bush",
};

export function debrisCount(mode: BreakMode, severity: number): number {
  const base = mode === "scatter" ? 7 : mode === "shatter" ? 5 : mode === "tip" ? 3 : 2;
  return Math.min(12, Math.floor(base + severity * 4));
}
