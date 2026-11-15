import type { CityConfig, CityId } from "./types.ts";
import { bengaluru } from "./city-bengaluru.ts";
import { gurugram } from "./city-gurugram.ts";
import { hyderabad } from "./city-hyderabad.ts";
import { pune } from "./city-pune.ts";

export const CITIES: Record<CityId, CityConfig> = { bengaluru, pune, hyderabad, gurugram };
export const CITY_IDS: CityId[] = ["bengaluru", "pune", "hyderabad", "gurugram"];
