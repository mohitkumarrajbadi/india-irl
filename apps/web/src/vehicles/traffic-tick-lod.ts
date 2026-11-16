/** Within-cull traffic tick rate LOD — aggressive on far agents for low-end. */

export type TrafficTickLod = "full" | "half" | "quarter";

/** Near = full; mid = half; far = quarter-rate integration. */
export function trafficTickLod(d2: number, trafficCull: number): TrafficTickLod {
  const mid = trafficCull * 0.38;
  const far = trafficCull * 0.72;
  if (d2 > far * far) return "quarter";
  if (d2 > mid * mid) return "half";
  return "full";
}

/** Whether this agent index should integrate on this frame. */
export function trafficShouldTick(
  lod: TrafficTickLod,
  agentIndex: number,
  frame: number,
): boolean {
  if (lod === "full") return true;
  if (lod === "half") return (agentIndex & 1) === (frame & 1);
  return (agentIndex & 3) === (frame & 3);
}
