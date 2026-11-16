import type { CityConfig, CityId } from "./types.ts";
import { CITY_IDS } from "./city-aliases.ts";
import { mandipura } from "./city-mandipura.ts";
import { neerabad } from "./city-neerabad.ts";
import { novapura } from "./city-novapura.ts";
import { udyogabad } from "./city-udyogabad.ts";

export { CITY_IDS, isCityId, resolveCityId, resolveMeetId } from "./city-aliases.ts";

export const CITIES: Record<CityId, CityConfig> = { novapura, mandipura, neerabad, udyogabad };
