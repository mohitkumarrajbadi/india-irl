export const SKIN_TONES = ["#f0c9a0", "#e2ac7b", "#c98d5c", "#b07445", "#955c36", "#7a4727", "#5e3319", "#4a2812"] as const;
export const HAIR_COLORS = ["#16100c", "#2a1a10", "#4a2f1c", "#6b6b6b", "#c9c9c4", "#7a2b1d", "#274a8a", "#a8742c"] as const;
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
  skin: 2,
  hair: 0,
  hairColor: 0,
  top: 5,
  topColor: 3,
  bottom: 0,
  bottomColor: 0,
  shoe: 0,
  shoeColor: 0,
  // Soft default — face reads cute without glasses covering the eyes
  acc: 2 | 4,
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
  out.acc = Number.isFinite(acc) ? Math.floor(acc) & 255 : DEFAULT_LOOK.acc;
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
    acc: r(256),
  };
}

export function cleanName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16);
}
