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
  bengaluru: {
    accent: "#5ecf8a",
    accentSoft: "rgba(94, 207, 138, 0.16)",
    nick: "Garden City",
    landmark: "Vidhana · Ecospace · Cubbon",
    mood: "Filter kaapi · Purple Line · ORR jams",
    art: "linear-gradient(145deg, #1a3d28 0%, #2f6b3a 42%, #7ec8a0 78%, #e7c56a 100%)",
  },
  pune: {
    accent: "#f0a05a",
    accentSoft: "rgba(240, 160, 90, 0.16)",
    nick: "Oxford of the East",
    landmark: "Shaniwar Wada · Hinjewadi",
    mood: "Misal · monsoon hills · FC Road",
    art: "linear-gradient(145deg, #4a2218 0%, #8a3b2e 40%, #e8913c 72%, #f2d9a0 100%)",
  },
  hyderabad: {
    accent: "#e86aa0",
    accentSoft: "rgba(232, 106, 160, 0.16)",
    nick: "Cyberabad",
    landmark: "Charminar · Cyber Towers · Cheruvu",
    mood: "Biryani · Deccan dust · Red Line",
    art: "linear-gradient(145deg, #2a1838 0%, #5c2a5e 38%, #d9548a 70%, #f2c230 100%)",
  },
  gurugram: {
    accent: "#5eb8e8",
    accentSoft: "rgba(94, 184, 232, 0.16)",
    nick: "Millennium City",
    landmark: "Cyber Hub · DLF · Rapid Metro",
    mood: "Glass canyons · NH-48 · after-hours",
    art: "linear-gradient(145deg, #0a2038 0%, #123a5c 40%, #3d86b8 72%, #b6d2ea 100%)",
  },
};
