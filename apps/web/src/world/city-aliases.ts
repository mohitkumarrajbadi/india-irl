/** Legacy deep-link / profile city + meet ids → canonical fictional ids. */
import type { CityId } from "./types-config.ts";

export const CITY_IDS: CityId[] = ["novapura", "mandipura", "neerabad", "udyogabad"];

/** Old real-city query params and common misspellings. */
const CITY_ALIASES: Record<string, CityId> = {
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

/** Per-city meet id aliases (old → new). Canonical ids also map to themselves. */
const MEET_ALIASES: Record<CityId, Record<string, string>> = {
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

export function isCityId(v: string | null | undefined): v is CityId {
  return !!v && CITY_IDS.includes(v as CityId);
}

/** Resolve query/profile city string to canonical CityId, or null. */
export function resolveCityId(v: string | null | undefined): CityId | null {
  if (!v) return null;
  const key = v.trim().toLowerCase();
  return CITY_ALIASES[key] ?? null;
}

/** Resolve meet id for a city (supports legacy meet deep links). */
export function resolveMeetId(city: CityId, meet: string | null | undefined): string | null {
  if (!meet) return null;
  const key = meet.trim().toLowerCase();
  return MEET_ALIASES[city]?.[key] ?? key;
}
