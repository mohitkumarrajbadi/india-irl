/**
 * Mirrors catalog/resident without @/ or package aliases (node strip-types).
 */
import { cellKey, cellOf, neighborhood, CHUNK_SIZE } from "../sim/chunk-cell.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

type StreamAsset = {
  id: string;
  type: "splat" | "glb";
  url: string;
  cx: number;
  cz: number;
  modId: string;
};

const byCell = new Map<string, StreamAsset[]>();
const byId = new Map<string, StreamAsset>();

function addManifest(manifest: {
  id: string;
  assets: (
    | { type: "splat" | "glb" | "texture"; url: string; cell: [number, number] }
    | { type: "clothes"; slot: string; glb: string }
  )[];
}): number {
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

function resident(x: number, z: number): StreamAsset[] {
  const { cx, cz } = cellOf(x, z);
  const out: StreamAsset[] = [];
  const seen = new Set<string>();
  for (const c of neighborhood(cx, cz)) {
    for (const a of byCell.get(cellKey(c.cx, c.cz)) ?? []) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}

assert(CHUNK_SIZE === 64, "chunk");
assert(
  addManifest({
    id: "t",
    assets: [
      { type: "glb", url: "/a.glb", cell: [0, 0] },
      { type: "splat", url: "/b.splat", cell: [1, 0] },
      { type: "clothes", slot: "top", glb: "/c.glb" },
      { type: "texture", url: "/d.png", cell: [0, 0] },
    ],
  }) === 2,
  "streamable only",
);
assert(byId.size === 2, "size");
assert((byCell.get(cellKey(0, 0)) ?? []).length === 1, "cell 0");
assert(resident(10, 10).length === 2, "9-cell");
assert(resident(200, 200).length === 0, "far");

console.log("catalog.test.ts ok");
