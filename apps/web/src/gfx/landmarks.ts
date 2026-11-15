import type { LandmarkKind } from "../world/types";
import { ecospace, vidhana } from "./landmark-bengaluru";
import { cableBridge, cyberHub } from "./landmark-gurgaon";
import { charminar, cyberTowers } from "./landmark-hyd";
import { infotechGate, shaniwar } from "./landmark-pune";
import type { LandmarkModel } from "./landmark-shared";

export type { LandmarkBox, LandmarkModel } from "./landmark-shared";
export { cableBridge };

const BUILDERS: Record<Exclude<LandmarkKind, "lake">, () => LandmarkModel> = {
  vidhana,
  ecospace,
  shaniwar,
  infotechGate,
  charminar,
  cyberTowers,
  cyberHub,
};

export function buildLandmark(kind: Exclude<LandmarkKind, "lake">): LandmarkModel {
  return BUILDERS[kind]();
}
