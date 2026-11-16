import type { CityId } from "./types";

/** Menu / marketing identity — keeps visual language distinct per city. */
export type CityUi = {
  accent: string;
  accentSoft: string;
  nick: string;
  landmark: string;
  /** Short weather / vibe line under the tagline. */
  mood: string;
  art: string;
};

export const CITY_UI: Record<CityId, CityUi> = {
  novapura: {
    accent: "#5ecf8a",
    accentSoft: "rgba(94, 207, 138, 0.16)",
    nick: "Campus Capital",
    landmark: "Assembly Dome · Campus Park · Gardens",
    mood: "Filter kaapi · Violet Line · Outer Ring jams",
    art: "linear-gradient(145deg, #1a3d28 0%, #2f6b3a 42%, #7ec8a0 78%, #e7c56a 100%)",
  },
  mandipura: {
    accent: "#f0a05a",
    accentSoft: "rgba(240, 160, 90, 0.16)",
    nick: "Market of the Hills",
    landmark: "Fort Chowk · Hillgate Arch",
    mood: "Misal · monsoon hills · Book Street",
    art: "linear-gradient(145deg, #4a2218 0%, #8a3b2e 40%, #e8913c 72%, #f2d9a0 100%)",
  },
  neerabad: {
    accent: "#e86aa0",
    accentSoft: "rgba(232, 106, 160, 0.16)",
    nick: "Pearl Shore",
    landmark: "Old Chowk · Lake Towers · Mirror Lake",
    mood: "Biryani · lakeside dust · Red Line",
    art: "linear-gradient(145deg, #2a1838 0%, #5c2a5e 38%, #d9548a 70%, #f2c230 100%)",
  },
  udyogabad: {
    accent: "#5eb8e8",
    accentSoft: "rgba(94, 184, 232, 0.16)",
    nick: "Glass Corridor",
    landmark: "Hub Plaza · Glass Mile · Rapid",
    mood: "Glass canyons · expressway · after-hours",
    art: "linear-gradient(145deg, #0a2038 0%, #123a5c 40%, #3d86b8 72%, #b6d2ea 100%)",
  },
};
