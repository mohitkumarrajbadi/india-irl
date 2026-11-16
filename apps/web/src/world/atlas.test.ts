import {
  WORLD_SEED,
  cityWorldOffset,
  corridorNovapuraMandipura,
  destinationFromCityMeet,
  regionAnchor,
  resolveDestination,
} from "./atlas.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(WORLD_SEED === 20261115, "seed");
assert(regionAnchor("novapura").center.x === 0, "novo origin");
assert(cityWorldOffset("mandipura").x > 5000, "mandi offset east");
const hwy = corridorNovapuraMandipura();
assert(hwy.points.length >= 3, "highway points");
assert(hwy.points[0].x < hwy.points[hwy.points.length - 1].x, "highway runs east");
const d = resolveDestination("mandipura-market");
assert(d.cityId === "mandipura", "dest city");
assert(destinationFromCityMeet("novapura", "kaapi-block").meetId === "kaapi-block", "meet dest");

console.log("atlas.test.ts ok");
