import assert from "node:assert/strict";
import { bakeSdf } from "./bake.ts";
import { sculpt } from "./nets.ts";

const mesh = sculpt("bake-test-head", 0.04, (s) => {
  s.ellipsoid([0.12, 0.14, 0.11], { pos: [0, 0.1, 0], k: 0.02, slot: 0 });
  s.ball(0.04, { pos: [0.08, 0.08, 0.04], k: 0.015, slot: 1, sym: true });
});

const geo = bakeSdf(mesh, ["#f3c9a8", "#e8b289"]);
assert.equal(geo.attributes.position.count, mesh.pos.length / 3);
assert.equal(geo.attributes.color.count, mesh.pos.length / 3);
assert.ok(geo.index);
// Dispose must not trash the sculpt cache — second bake still works.
geo.dispose();
const geo2 = bakeSdf(mesh, ["#ffffff", "#cccccc"]);
assert.equal(geo2.attributes.position.count, mesh.pos.length / 3);
geo2.dispose();
console.log("sdf bake.test.ts ok");
