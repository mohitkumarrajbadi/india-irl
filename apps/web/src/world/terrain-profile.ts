/** Per-city terrain silhouette (hills direction, rise, apron). */
import type { CityId } from "./types-config.ts";

export type TerrainProfile = {
  /** Unit-ish direction toward highland. */
  hillAx: number;
  hillAz: number;
  /** Max apron height in metres. */
  hillRise: number;
  /** How far past city bounds the apron extends. */
  apron: number;
  /** Extra horizon-hill strength (0…1) layered on skyline.hills. */
  skyBoost: number;
};

export const TERRAIN_PROFILES: Record<CityId, TerrainProfile> = {
  novapura: { hillAx: 0.15, hillAz: -1, hillRise: 52, apron: 480, skyBoost: 0.28 },
  mandipura: { hillAx: -0.65, hillAz: -0.75, hillRise: 40, apron: 420, skyBoost: 0.22 },
  neerabad: { hillAx: 0.55, hillAz: 0.45, hillRise: 32, apron: 400, skyBoost: 0.18 },
  udyogabad: { hillAx: 0.1, hillAz: 1, hillRise: 10, apron: 360, skyBoost: 0.04 },
};

export function terrainProfile(id: CityId): TerrainProfile {
  return TERRAIN_PROFILES[id] ?? TERRAIN_PROFILES.novapura;
}
