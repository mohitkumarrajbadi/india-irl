/** Contextual interaction prompt — only when an action is available. */
import {
  apartmentInside,
  apartmentList,
  apartmentPending,
} from "@/game/apartment";
import { findNearestEnterable, trafficKindLabel } from "@/game/enterable-vehicles";
import { runtime } from "@/game/runtime";
import { isSocialV2Enabled } from "@/game/sim/flags";
import { hangoutPrompt } from "@/game/social/hangout";
import type { Peer } from "@/net/store";
import { SPECS } from "@/vehicles/specs";
import type { TrafficKind } from "@/vehicles/traffic-kinds";
import { nearestApartment } from "@/world/apartments";
import type { CityData } from "@/world/types";
import { findNearestRide } from "./find-nearest-ride.ts";
import type { PlayerState } from "./types.ts";

function trafficLabel(kind: number): string {
  return trafficKindLabel(kind as TrafficKind);
}

export function contextualPrompt(
  s: PlayerState,
  city: CityData,
  peerMap: Map<string, Peer>,
): string {
  if (s.mode === "drive" || s.mode === "passenger") return "F  Exit Vehicle";

  if (apartmentInside()) return "E  Leave flat · C invite";
  if (apartmentPending()) return "E  Accept flat invite";

  const apt = nearestApartment(s.x, s.z, apartmentList(city));
  if (apt) return `E  Enter · ${apt.label}`;

  const near = findNearestRide(s.x, s.z, peerMap);
  if (near) return `F  Enter Vehicle · ${near.name}`;

  const hit = findNearestEnterable(s.x, s.z, city, runtime.traffic?.agents ?? null);
  const hitD = hit ? (hit.x - s.x) ** 2 + (hit.z - s.z) ** 2 : Infinity;
  let remD = Infinity;
  if (s.parked && performance.now() < s.parked.until) {
    remD = (s.parked.x - s.x) ** 2 + (s.parked.z - s.z) ** 2;
  }
  const enterLabel = (h: NonNullable<typeof hit>): string => {
    const name = h.source === "traffic" ? trafficLabel(h.trafficKind) : SPECS[h.kind].name;
    if (h.source === "traffic") {
      const agent = runtime.traffic?.agents[h.index];
      if (agent && (Math.abs(agent.speed) > 2.5 || agent.hasPillion)) {
        return `F  Steal · ${name}`;
      }
    }
    return `F  Enter · ${name}`;
  };

  // Match vehicleAction: nearby world vehicle beats a farther stash remount.
  if (hit && hitD <= remD) return enterLabel(hit);
  if (s.parked && remD < 18 * 18) {
    return `F  Enter · ${SPECS[s.parked.kind].name}`;
  }
  if (hit) return enterLabel(hit);

  if (isSocialV2Enabled()) {
    const sit = hangoutPrompt(city, s.x, s.z);
    if (sit) return sit.replace(" · ", "  ").replace("E ·", "E ");
  }

  return "";
}
