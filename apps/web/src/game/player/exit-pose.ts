/**
 * Foot spawn when leaving a chassis — try both flanks, keep the freer side.
 * India LHT: prefer right (driver) first when both are clear.
 */
/** Matches FOOT.radius — inlined so node tests stay free of @/ chains. */
const FOOT_R = 0.32;

export type ExitGrid = {
  resolve: (x: number, z: number, r: number, out: { x: number; z: number }) => void;
};

const scratch = { x: 0, z: 0 };

export function exitFootPose(
  ds: { x: number; z: number; yaw: number },
  width: number,
  grid: ExitGrid | null | undefined,
): { x: number; z: number; facing: number } {
  const cos = Math.cos(ds.yaw);
  const sin = Math.sin(ds.yaw);
  const off = width / 2 + 0.7;
  // Right (+local X), then left — driver door first for RHD / LHT traffic.
  const candidates: [number, number][] = [
    [ds.x + cos * off, ds.z - sin * off],
    [ds.x - cos * off, ds.z + sin * off],
  ];
  if (!grid) {
    return { x: candidates[0]![0], z: candidates[0]![1], facing: ds.yaw };
  }

  let bestX = candidates[0]![0];
  let bestZ = candidates[0]![1];
  let bestPush = Infinity;
  for (const [cx, cz] of candidates) {
    grid.resolve(cx, cz, FOOT_R, scratch);
    const push = (scratch.x - cx) ** 2 + (scratch.z - cz) ** 2;
    if (push < bestPush) {
      bestPush = push;
      bestX = scratch.x;
      bestZ = scratch.z;
    }
  }
  return { x: bestX, z: bestZ, facing: ds.yaw };
}
