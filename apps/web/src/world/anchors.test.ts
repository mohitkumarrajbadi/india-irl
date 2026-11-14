import { anchorsFromCity, nearestAnchor } from "./anchors.ts";
import type { CityData } from "./types.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const city = {
  meets: [
    { spec: { id: "hub", label: "Hub", bi: 0, bj: 0, blurb: "" }, x: 10, z: 20 },
  ],
} as unknown as CityData;

const list = anchorsFromCity(city);
assert(list.length === 2, "two benches");
const near = nearestAnchor(list[0].x, list[0].z, list);
assert(near?.id === list[0].id, "nearest self");
assert(nearestAnchor(500, 500, list) === null, "far");

console.log("anchors.test.ts ok");
