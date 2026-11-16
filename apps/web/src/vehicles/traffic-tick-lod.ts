/** Within-cull traffic tick rate LOD. */

export type TrafficTickLod = "full" | "half";

/** Farther than ~half cull → alternate-frame integration. */
export function trafficTickLod(d2: number, trafficCull: number): TrafficTickLod {
  const mid = trafficCull * 0.48;
  return d2 > mid * mid ? "half" : "full";
}

/** Whether this agent index should integrate on this frame. */
export function trafficShouldTick(
  lod: TrafficTickLod,
  agentIndex: number,
  frame: number,
): boolean {
  if (lod === "full") return true;
  return (agentIndex & 1) === (frame & 1);
}
