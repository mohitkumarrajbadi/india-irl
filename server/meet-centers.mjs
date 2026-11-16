/**
 * Meet plaza world centers — MUST match generateCity() output.
 * Regenerated from: node --experimental-strip-types -e "import {CITIES,CITY_IDS} from './apps/web/src/world/cities.ts'; import {generateCity} from './apps/web/src/world/generate.ts'; ..."
 * Radius: 40 m (same as MEET_RADIUS in apps/web/src/world/meets.ts).
 */
export const MEET_RADIUS2 = 40 * 40;

/** Legacy deep-link city ids → canonical fictional rooms. */
export const CITY_ALIASES = {
  novapura: "novapura",
  mandipura: "mandipura",
  neerabad: "neerabad",
  udyogabad: "udyogabad",
  bengaluru: "novapura",
  bangalore: "novapura",
  pune: "mandipura",
  hyderabad: "neerabad",
  gurugram: "udyogabad",
  gurgaon: "udyogabad",
};

/** Legacy meet ids → canonical meet ids per city. */
export const MEET_ALIASES = {
  novapura: {
    "kaapi-block": "kaapi-block",
    "campus-lawn": "campus-lawn",
    "central-gardens": "central-gardens",
    "ridge-view": "ridge-view",
    koramangala: "kaapi-block",
    ecospace: "campus-lawn",
    cubbon: "central-gardens",
    "nandi-view": "ridge-view",
  },
  mandipura: {
    "book-street": "book-street",
    hillgate: "hillgate",
    "fort-chowk": "fort-chowk",
    "fc-road": "book-street",
    hinjewadi: "hillgate",
    wada: "fort-chowk",
  },
  neerabad: {
    "old-chowk": "old-chowk",
    "lake-towers": "lake-towers",
    "cable-bridge": "cable-bridge",
    charminar: "old-chowk",
    hitec: "lake-towers",
    cheruvu: "cable-bridge",
  },
  udyogabad: {
    "hub-plaza": "hub-plaza",
    "glass-mile": "glass-mile",
    "food-sector": "food-sector",
    "cyber-hub": "hub-plaza",
    "cyber-city": "glass-mile",
    "sector-29": "food-sector",
  },
};

export function resolveCityId(raw) {
  if (!raw) return null;
  return CITY_ALIASES[String(raw).trim().toLowerCase()] ?? null;
}

export function resolveMeetId(city, meet) {
  if (!meet || !city) return null;
  const key = String(meet).trim().toLowerCase();
  return MEET_ALIASES[city]?.[key] ?? key;
}

/** @type {Record<string, { id: string, label: string, x: number, z: number }[]>} */
export const MEET_CENTERS = {
  novapura: [
    { id: "kaapi-block", label: "Kaapi Block Plaza", x: -183.49, z: -144.12 },
    { id: "campus-lawn", label: "Campus Lawn", x: 172.5, z: 151.63 },
    { id: "central-gardens", label: "Central Gardens Gate", x: -117.14, z: 222.61 },
    { id: "ridge-view", label: "Ridge View approach", x: -50.22, z: -365.99 },
  ],
  mandipura: [
    { id: "book-street", label: "Book Street Cafe Strip", x: -119.02, z: -119.04 },
    { id: "hillgate", label: "Hillgate Arch", x: 190.98, z: 194.38 },
    { id: "fort-chowk", label: "Fort Chowk", x: -188.83, z: -360.58 },
  ],
  neerabad: [
    { id: "old-chowk", label: "Old Chowk", x: -349.65, z: -344.99 },
    { id: "lake-towers", label: "Lake Towers Plaza", x: -4.91, z: 89.88 },
    { id: "cable-bridge", label: "Mirror Lake Bridge", x: 353.26, z: 258.03 },
  ],
  udyogabad: [
    { id: "hub-plaza", label: "Hub Plaza", x: 38, z: 56.4 },
    { id: "glass-mile", label: "Glass Mile Towers", x: 339.31, z: 352.4 },
    { id: "food-sector", label: "Food Sector Street", x: 148.61, z: -234.15 },
  ],
};

/** World atlas offsets — keep in sync with apps/web/src/world/atlas.ts */
export const WORLD_OFFSETS = {
  novapura: { x: 0, z: 0 },
  mandipura: { x: 6200, z: 900 },
  neerabad: { x: 1800, z: 5200 },
  udyogabad: { x: -4800, z: 2200 },
};

/** Flatten city meets into world space for the shared `ommo` room. */
export function worldMeetCenters() {
  /** @type {{ id: string, label: string, x: number, z: number, city: string }[]} */
  const out = [];
  for (const [city, list] of Object.entries(MEET_CENTERS)) {
    const off = WORLD_OFFSETS[city] ?? { x: 0, z: 0 };
    for (const m of list) {
      out.push({ id: m.id, label: m.label, x: m.x + off.x, z: m.z + off.z, city });
    }
  }
  return out;
}

export function nearestMeetId(city, x, z) {
  const list = city === "ommo" ? worldMeetCenters() : MEET_CENTERS[city];
  if (!list || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  let best = null;
  let bd = MEET_RADIUS2;
  for (const m of list) {
    const d = (m.x - x) ** 2 + (m.z - z) ** 2;
    if (d <= bd) {
      bd = d;
      best = m.id;
    }
  }
  return best;
}
