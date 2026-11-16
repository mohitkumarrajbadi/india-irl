import { CITIES } from "../../world/cities.ts";
import { generateCity } from "../../world/generate.ts";
import { CHUNK_SIZE } from "./chunk-cell.ts";
import { buildRoadChunk, ROAD_SURFACE_Y } from "./road-builder.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const city = generateCity(CITIES.novapura);
const { cx, cz } = {
  cx: Math.floor(city.spawn.x / CHUNK_SIZE),
  cz: Math.floor(city.spawn.z / CHUNK_SIZE),
};
const mesh = buildRoadChunk(city, cx, cz);
assert(mesh.verts.length >= 12, "spawn cell has road verts");
assert(mesh.indices.length >= 6, "spawn cell has triangles");
// Urban spawn stays near flat
assert(Math.abs(mesh.verts[1]! - ROAD_SURFACE_Y) < 1.2, "spawn road Y near surface");

const empty = buildRoadChunk(city, 999, 999);
assert(empty.verts.length === 0, "far cell has no roads");

const fo = city.flyovers[0];
assert(fo, "flyover expected");
const fcx = Math.floor(fo!.x / CHUNK_SIZE);
const fcz = Math.floor(((fo!.z0 + fo!.z1) * 0.5) / CHUNK_SIZE);
const fly = buildRoadChunk(city, fcx, fcz);
let maxY = 0;
for (let i = 1; i < fly.verts.length; i += 3) maxY = Math.max(maxY, fly.verts[i]!);
assert(maxY >= fo!.deckY * 0.85, `flyover chunk should include deck verts, maxY=${maxY}`);

console.log("road-builder.test.ts ok");
