import { generateWorld, isWorldData } from "./generate-world.ts";
import { cityWorldOffset } from "./atlas.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const a = generateWorld({ mode: "prototype", cityId: "novapura", meetId: "kaapi-block" });
const b = generateWorld({ mode: "prototype", cityId: "novapura", meetId: "kaapi-block" });
assert(isWorldData(a), "named OMMO");
assert(a.buildings.length === b.buildings.length, "deterministic building count");
assert(a.meets.length === b.meets.length, "deterministic meets");
assert(Math.abs(a.spawn.x - b.spawn.x) < 1e-6, "deterministic spawn x");

const mandi = cityWorldOffset("mandipura");
assert(a.bounds.maxX > mandi.x - 600, "bounds reach mandipura");
assert(a.trails.length >= 1, "highway trail present");
assert(a.villages.length >= 1, "highway village");

const hwy = generateWorld({ mode: "prototype", destId: "village-square" });
assert(Math.abs(hwy.spawn.x - 3100) < 80 || hwy.villages.length > 0, "village spawn near corridor");

// Road continuity: some road line near novo east and mandi west
const nearNovoExit = a.trails.some((t) => t.points.some((p) => p.x > 400 && p.x < 1200));
const nearMandiEntry = a.trails.some((t) => t.points.some((p) => p.x > 5000));
assert(nearNovoExit && nearMandiEntry, "corridor spans novo→mandi");

console.log("generate-world.test.ts ok");
