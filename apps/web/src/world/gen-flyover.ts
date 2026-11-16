/** One elevated arterial flyover — ramps onto deck; mid-span drive-under at ground. */
import type { GenBuffers } from "./gen-buffers.ts";
import type { Flyover } from "./types.ts";

export function buildFlyover(g: GenBuffers): Flyover | null {
  const { cfg, xs, zs, roadsX, roadsZ } = g;
  // Prefer a mid arterial running N–S
  let bestI = -1;
  for (let i = 2; i < cfg.cols - 1; i += 1) {
    if (!roadsX[i]?.arterial) continue;
    bestI = i;
    break;
  }
  if (bestI < 0) return null;
  const j0 = Math.max(1, Math.floor(cfg.rows * 0.3));
  const j1 = Math.min(cfg.rows - 1, j0 + 2);
  const x = xs[bestI]!;
  const half = roadsX[bestI]!.half;
  const z0 = zs[j0]! + roadsZ[j0]!.half + 2;
  const z1 = zs[j1]! - roadsZ[j1]!.half - 2;
  if (z1 - z0 < 40) return null;

  const pillars: { x: number; z: number }[] = [];
  for (let z = z0 + 8; z < z1 - 8; z += 14) {
    pillars.push({ x: x - half * 0.55, z }, { x: x + half * 0.55, z });
    g.circles.push({ x: x - half * 0.55, z, r: 0.7 });
    g.circles.push({ x: x + half * 0.55, z, r: 0.7 });
  }

  return {
    x,
    half: half * 0.92,
    z0,
    z1,
    deckY: 7.2,
    pillars,
  };
}
