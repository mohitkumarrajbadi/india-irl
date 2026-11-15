/** Contextual interaction prompt — only when an action is available. */
import { findNearestEnterable, trafficKindToVehicle } from "@/game/enterable-vehicles";
import { runtime } from "@/game/runtime";
import { isSocialV2Enabled } from "@/game/sim/flags";
import { hangoutPrompt } from "@/game/social/hangout";
import type { Peer } from "@/net/store";
import { SPECS } from "@/vehicles/specs";
import type { CityData } from "@/world/types";
import { findNearestRide } from "./find-nearest-ride.ts";
import type { PlayerState } from "./types.ts";

function trafficLabel(kind: number): string {
  if (kind === 3) return "Bus";
  if (kind === 4) return "Truck";
  return SPECS[trafficKindToVehicle(kind as 0 | 1 | 2 | 3 | 4)].name;
}

export function contextualPrompt(
  s: PlayerState,
  city: CityData,
  peerMap: Map<string, Peer>,
): string {
  if (s.mode === "drive" || s.mode === "passenger") return "F  Exit Vehicle";

  const near = findNearestRide(s.x, s.z, peerMap);
  if (near) return `F  Enter Vehicle · ${near.name}`;

  if (s.parked && performance.now() < s.parked.until) {
    const d = (s.parked.x - s.x) ** 2 + (s.parked.z - s.z) ** 2;
    if (d < 18 * 18) return `F  Enter Vehicle · ${SPECS[s.parked.kind].name}`;
  }

  const hit = findNearestEnterable(s.x, s.z, city, runtime.traffic?.agents ?? null);
  if (hit) {
    const name =
      hit.source === "traffic" ? trafficLabel(hit.trafficKind) : SPECS[hit.kind].name;
    return `F  Enter Vehicle · ${name}`;
  }

  if (isSocialV2Enabled()) {
    const sit = hangoutPrompt(city, s.x, s.z);
    if (sit) return sit.replace(" · ", "  ").replace("E ·", "E ");
  }

  return "";
}
