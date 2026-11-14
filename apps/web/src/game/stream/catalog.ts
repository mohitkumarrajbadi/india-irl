/** Registry of streamable world assets keyed by cell. */
import type { ModManifest } from "@india-irl/mods";
import { cellKey } from "../sim/chunk-cell.ts";

export type StreamAsset = {
  id: string;
  type: "splat" | "glb";
  url: string;
  cx: number;
  cz: number;
  modId: string;
};

const byCell = new Map<string, StreamAsset[]>();
const byId = new Map<string, StreamAsset>();

export function catalogClear(): void {
  byCell.clear();
  byId.clear();
}

export function catalogAddManifest(manifest: ModManifest): number {
  let n = 0;
  for (const a of manifest.assets) {
    if (a.type !== "splat" && a.type !== "glb") continue;
    const id = `${manifest.id}:${a.type}:${a.url}:${a.cell[0]},${a.cell[1]}`;
    if (byId.has(id)) continue;
    const asset: StreamAsset = {
      id,
      type: a.type,
      url: a.url,
      cx: a.cell[0],
      cz: a.cell[1],
      modId: manifest.id,
    };
    byId.set(id, asset);
    const key = cellKey(asset.cx, asset.cz);
    const list = byCell.get(key) ?? [];
    list.push(asset);
    byCell.set(key, list);
    n += 1;
  }
  return n;
}

export function catalogAssetsInCell(cx: number, cz: number): readonly StreamAsset[] {
  return byCell.get(cellKey(cx, cz)) ?? [];
}

export function catalogSize(): number {
  return byId.size;
}

/** Dev helper — register one asset without a full manifest. */
export function catalogAddAsset(asset: StreamAsset): void {
  if (byId.has(asset.id)) return;
  byId.set(asset.id, asset);
  const key = cellKey(asset.cx, asset.cz);
  const list = byCell.get(key) ?? [];
  list.push(asset);
  byCell.set(key, list);
}
