/**
 * Junction traffic-light phases. Cycle is shared city-wide with a junction offset
 * so adjacent crossings aren't all green together.
 */
export type LightPhase = "red" | "amber" | "green";

const CYCLE = 14; // seconds: green 8 + amber 2 + red 4 (simplified pair)
const GREEN = 8;
const AMBER = 2;

function junctionKey(ni: number, nj: number): number {
  // Stable hash → phase offset
  let h = (ni * 73856093) ^ (nj * 19349663);
  h = (h >>> 0) % 10_000;
  return h / 10_000;
}

/** Phase for traffic approaching junction (ni,nj) along `dir` (0..3). */
export function signalPhase(ni: number, nj: number, dir: number, timeSec: number): LightPhase {
  const offset = junctionKey(ni, nj) * CYCLE;
  // Odd dirs share one pair; even dirs the opposite (crossing traffic).
  const pair = dir % 2;
  const t = ((timeSec + offset + pair * (CYCLE * 0.5)) % CYCLE + CYCLE) % CYCLE;
  if (t < GREEN) return "green";
  if (t < GREEN + AMBER) return "amber";
  return "red";
}

/**
 * Desired speed scale for an agent approaching its junction.
 * Red near the stop line → hard brake; amber → ease off.
 */
export function signalWantScale(
  ni: number,
  nj: number,
  dir: number,
  distToJunction: number,
  timeSec: number,
): number {
  const phase = signalPhase(ni, nj, dir, timeSec);
  if (phase === "green") return 1;
  if (distToJunction > 22) return 1;
  if (phase === "amber") return distToJunction < 10 ? 0.35 : 0.7;
  // Red
  if (distToJunction < 4) return 0;
  if (distToJunction < 14) return 0.15;
  return 0.55;
}

/** Visual lamp for prop extras (index into city.extras filtered to signals). */
export function signalLampPhase(extraIndex: number, timeSec: number): LightPhase {
  const t = ((timeSec + (extraIndex % 7) * 1.7) % CYCLE + CYCLE) % CYCLE;
  if (t < GREEN) return "green";
  if (t < GREEN + AMBER) return "amber";
  return "red";
}

/**
 * Lamp phase synced to the NPC junction controller.
 * Finds the nearest junction and maps pole facing → approach dir (0..3).
 */
export function signalLampPhaseAt(
  x: number,
  z: number,
  rot: number,
  xs: readonly number[],
  zs: readonly number[],
  timeSec: number,
): LightPhase {
  let ni = 0;
  let nj = 0;
  let best = Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = 0; j < zs.length; j += 1) {
      const dx = x - xs[i];
      const dz = z - zs[j];
      const d = dx * dx + dz * dz;
      if (d < best) {
        best = d;
        ni = i;
        nj = j;
      }
    }
  }
  // Cardinal facing from rot (arm over road → traffic that sees this head)
  const dir = (((Math.round(rot / (Math.PI / 2)) % 4) + 4) % 4);
  return signalPhase(ni, nj, dir, timeSec);
}
