/** Nearby road placement for session-start traffic fill. */
import { clamp } from "../lib/math.ts";
import { lineIndex } from "../world/generate.ts";
import { DX, DZ, type Agent } from "./traffic-kinds.ts";
import { placeAgent, type NavCtx } from "./traffic-nav.ts";

function junctionOk(cols: number, rows: number, i: number, j: number): boolean {
  return i >= 0 && i <= cols && j >= 0 && j <= rows;
}

/** Place on a nearby road cell — used at session start so streets feel populated. */
export function placeNearbyAgent(ctx: NavCtx, a: Agent, px: number, pz: number): void {
  const { city, cols, rows, rng } = ctx;
  const { xs, zs } = city;
  const pi = lineIndex(xs, px);
  const pj = lineIndex(zs, pz);
  const spread = 4;
  for (let tries = 0; tries < 18; tries += 1) {
    const i = clamp(pi + Math.floor(rng() * (spread * 2 + 1)) - spread, 0, cols - 1);
    const j = clamp(pj + Math.floor(rng() * (spread * 2 + 1)) - spread, 0, rows - 1);
    const dir = Math.floor(rng() * 4);
    if (!junctionOk(cols, rows, i + DX[dir]!, j + DZ[dir]!)) continue;
    placeAgent(ctx, a, i, j, dir);
    const d = Math.hypot(a.x - px, a.z - pz);
    if (d > 14 && d < 90) {
      a.appearT = 0;
      return;
    }
  }
  const fi = clamp(pi + (rng() < 0.5 ? 1 : -1), 1, cols - 2);
  const fj = clamp(pj, 1, rows - 2);
  placeAgent(ctx, a, fi, fj, rng() < 0.5 ? 0 : 1);
  a.appearT = 0;
}
