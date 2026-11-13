/** @deprecated Prefer `flags.ts` — kept as a stable import path for Phase A. */
import { isShadowSimEnabled, setFeatureFlag } from "./flags";

export { isShadowSimEnabled };

export function setShadowSimEnabled(on: boolean): void {
  setFeatureFlag("shadowSim", on);
}
