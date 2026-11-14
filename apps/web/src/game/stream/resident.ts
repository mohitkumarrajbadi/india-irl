/** Compute which catalog assets should be mounted for the player cell. */
import { cellOf, neighborhood } from "../sim/chunk-cell.ts";
import { catalogAssetsInCell, type StreamAsset } from "./catalog.ts";

export function residentAssets(x: number, z: number): StreamAsset[] {
  const { cx, cz } = cellOf(x, z);
  const out: StreamAsset[] = [];
  const seen = new Set<string>();
  for (const c of neighborhood(cx, cz)) {
    for (const a of catalogAssetsInCell(c.cx, c.cz)) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}
