import { CITIES } from "../../world/cities.ts";
import { generateCity } from "../../world/generate.ts";
import { CHUNK_SIZE } from "./chunk-cell.ts";
import { buildRoadChunk, ROAD_SURFACE_Y } from "./road-builder.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const city = generateCity(CITIES.bengaluru);
const { cx, cz } = {
  cx: Math.floor(city.spawn.x / CHUNK_SIZE),
  cz: Math.floor(city.spawn.z / CHUNK_SIZE),
};
const mesh = buildRoadChunk(city, cx, cz);
assert(mesh.verts.length >= 12, "spawn cell has road verts");
assert(mesh.indices.length >= 6, "spawn cell has triangles");
assert(mesh.verts[1] === ROAD_SURFACE_Y, "road Y aligns to surface");

const empty = buildRoadChunk(city, 999, 999);
assert(empty.verts.length === 0, "far cell has no roads");

console.log("road-builder.test.ts ok");
