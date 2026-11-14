/** Warmer peachy skins — Memoji clay look. */
export const SKIN_TONES = ["#f3c9a8", "#e8b289", "#d49a68", "#b87d4c", "#9a6338", "#7d4c28", "#5e3518", "#4a2812"] as const;
export const HAIR_COLORS = ["#1a1410", "#2c1e14", "#3d2a1c", "#4a4a4e", "#c4c4c0", "#6b2a1c", "#2a3a5a", "#8a6a3a"] as const;
export const TOP_COLORS = [
  "#e07a3d", "#f2c230", "#d9e3df", "#1d4e89", "#b3261e", "#1f7a3a", "#6a1b4d", "#151515",
  "#f4efe2", "#7ec8c8", "#e6a1b8", "#4d5a3c",
] as const;
export const BOTTOM_COLORS = ["#243044", "#151515", "#4a4036", "#6b6b6b", "#d8cfb8", "#1f3a5f", "#7a2b1d", "#f4efe2"] as const;
export const SHOE_COLORS = ["#f4f4f4", "#161616", "#b3261e", "#1d4e89", "#6b4a2b", "#e2a02c"] as const;

export const BODY_NAMES = ["Lean", "Regular", "Broad"] as const;
export const HAIR_NAMES = ["Crop", "Long", "Bun", "Curly", "Pagri", "Cap", "Bald", "Ponytail", "Fade", "Hijab"] as const;
export const TOP_NAMES = ["T-shirt", "Shirt", "Hoodie", "Kurta", "Saree", "Tech tee", "Blazer"] as const;
export const BOTTOM_NAMES = ["Jeans", "Trousers", "Shorts", "Skirt", "Lungi", "Salwar"] as const;
export const SHOE_NAMES = ["Sneakers", "Formal", "Chappals"] as const;

export const ACCESSORIES = [
  { bit: 1, name: "Glasses" },
  { bit: 2, name: "Company ID" },
  { bit: 4, name: "Laptop bag" },
  { bit: 8, name: "Headphones" },
  { bit: 256, name: "AirPods" },
  { bit: 16, name: "Bindi / Tilak" },
  { bit: 32, name: "Beard" },
  { bit: 64, name: "Watch" },
  { bit: 128, name: "Hoops" },
] as const;

export type Look = {
  body: number;
  skin: number;
  hair: number;
  hairColor: number;
  top: number;
  topColor: number;
  bottom: number;
  bottomColor: number;
  shoe: number;
  shoeColor: number;
  acc: number;
};

export const DEFAULT_LOOK: Look = {
  body: 1,
  skin: 1,
  hair: 8,
  hairColor: 0,
  top: 2,
  topColor: 10,
  bottom: 0,
  bottomColor: 0,
  shoe: 0,
  shoeColor: 0,
  // Clean Memoji face by default
  acc: 0,
};

const FIELD_LIMITS: [keyof Look, number][] = [
  ["body", BODY_NAMES.length],
  ["skin", SKIN_TONES.length],
  ["hair", HAIR_NAMES.length],
  ["hairColor", HAIR_COLORS.length],
  ["top", TOP_NAMES.length],
  ["topColor", TOP_COLORS.length],
  ["bottom", BOTTOM_NAMES.length],
  ["bottomColor", BOTTOM_COLORS.length],
  ["shoe", SHOE_NAMES.length],
  ["shoeColor", SHOE_COLORS.length],
];

/** Wire format: ten small ints and an accessory bitmask. */
export function encodeLook(look: Look): number[] {
  return [...FIELD_LIMITS.map(([k]) => look[k]), look.acc];
}

/** Never trust the network: clamp everything into range. */
export function decodeLook(raw: unknown): Look {
  const out: Look = { ...DEFAULT_LOOK };
  if (!Array.isArray(raw)) return out;
  FIELD_LIMITS.forEach(([key, limit], i) => {
    const v = Number(raw[i]);
    out[key] = Number.isFinite(v) ? Math.min(limit - 1, Math.max(0, Math.floor(v))) : DEFAULT_LOOK[key];
  });
  const acc = Number(raw[FIELD_LIMITS.length]);
  out.acc = Number.isFinite(acc) ? Math.floor(acc) & 511 : DEFAULT_LOOK.acc;
  return out;
}

export function lookKey(look: Look): string {
  return encodeLook(look).join(".");
}

export function randomLook(): Look {
  const r = (n: number) => Math.floor(Math.random() * n);
  return {
    body: r(BODY_NAMES.length),
    skin: r(SKIN_TONES.length),
    hair: r(HAIR_NAMES.length),
    hairColor: r(HAIR_COLORS.length),
    top: r(TOP_NAMES.length),
    topColor: r(TOP_COLORS.length),
    bottom: r(BOTTOM_NAMES.length),
    bottomColor: r(BOTTOM_COLORS.length),
    shoe: r(SHOE_NAMES.length),
    shoeColor: r(SHOE_COLORS.length),
    acc: r(512),
  };
}

export function cleanName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16);
}
