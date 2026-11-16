/** Dipped arterial underpass under a crossing arterial. */
import type { GenBuffers } from "./gen-buffers.ts";
import type { Underpass } from "./types.ts";

const FLOOR_Y = -3.4;
const SPAN = 48;

/** Prefer E–W arterial dipping under a mid N–S arterial. */
export function buildUnderpass(g: GenBuffers): Underpass | null {
  const { cfg, xs, zs, roadsX, roadsZ } = g;
  let crossI = -1;
  for (let i = Math.floor(cfg.cols * 0.45); i < cfg.cols - 2; i += 1) {
    if (!roadsX[i]?.arterial) continue;
    // Avoid sharing the flyover N–S arterial when possible
    crossI = i;
    break;
  }
  if (crossI < 0) {
    for (let i = 2; i < cfg.cols - 1; i += 1) {
      if (roadsX[i]?.arterial) {
        crossI = i;
        break;
      }
    }
  }
  if (crossI < 0) return null;

  let travelJ = -1;
  for (let j = Math.floor(cfg.rows * 0.55); j < cfg.rows - 2; j += 1) {
    if (roadsZ[j]?.arterial) {
      travelJ = j;
      break;
    }
  }
  if (travelJ < 0) {
    for (let j = 2; j < cfg.rows - 1; j += 1) {
      if (roadsZ[j]?.arterial) {
        travelJ = j;
        break;
      }
    }
  }
  if (travelJ < 0) return null;

  const cross = roadsX[crossI]!;
  const travel = roadsZ[travelJ]!;
  const cx = xs[crossI]!;
  const cz = zs[travelJ]!;
  const half = travel.half * 0.95;
  const a0 = cx - SPAN * 0.5;
  const a1 = cx + SPAN * 0.5;

  // Retaining walls along the trough (outside travel lanes)
  const wallH = 3.2;
  const wallT = 0.55;
  const wallZ0 = cz - half - wallT;
  const wallZ1 = cz + half;
  g.boxes.push(
    { minX: a0 + 10, maxX: a1 - 10, minZ: wallZ0 - wallT, maxZ: wallZ0, h: wallH },
    { minX: a0 + 10, maxX: a1 - 10, minZ: wallZ1, maxZ: wallZ1 + wallT, h: wallH },
  );

  return {
    axis: "x",
    c: cz,
    half,
    a0,
    a1,
    floorY: FLOOR_Y,
    crossC: cx,
    crossHalf: cross.half,
  };
}
