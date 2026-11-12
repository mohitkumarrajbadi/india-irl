/**
 * Meet plaza world centers — MUST match generateCity() output.
 * Regenerated from: node --experimental-strip-types -e "import {CITIES} from './src/world/cities.ts'; import {generateCity} from './src/world/generate.ts'; ..."
 * Radius: 40 m (same as MEET_RADIUS in src/world/meets.ts).
 */
export const MEET_RADIUS2 = 40 * 40;

/** @type {Record<string, { id: string, label: string, x: number, z: number }[]>} */
export const MEET_CENTERS = {
  bengaluru: [
    { id: "koramangala", label: "Koramangala 5th Block", x: -170.37, z: -153.1 },
    { id: "ecospace", label: "Ecospace Lawn", x: 236.01, z: 159.18 },
    { id: "cubbon", label: "Cubbon Park Gate", x: -90.32, z: 234.76 },
  ],
  pune: [
    { id: "fc-road", label: "FC Road Cafe Strip", x: -165.3, z: -169.12 },
    { id: "hinjewadi", label: "Hinjewadi Gate", x: 172.46, z: 160.85 },
    { id: "wada", label: "Shaniwar Wada", x: -249.03, z: -326.67 },
  ],
  hyderabad: [
    { id: "charminar", label: "Charminar Chowk", x: -332.22, z: -304.27 },
    { id: "hitec", label: "Cyber Towers Plaza", x: -14.98, z: 90.86 },
    { id: "cheruvu", label: "Durgam Cheruvu Bridge", x: 322.78, z: 228.68 },
  ],
  gurugram: [
    { id: "cyber-hub", label: "DLF Cyber Hub", x: 10.27, z: 4.5 },
    { id: "cyber-city", label: "Cyber City Towers", x: 265.97, z: 262.97 },
    { id: "sector-29", label: "Sector 29 Food Street", x: 102.86, z: -259.73 },
  ],
};

export function nearestMeetId(city, x, z) {
  const list = MEET_CENTERS[city];
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
