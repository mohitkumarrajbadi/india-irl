import assert from "node:assert/strict";
import { pickEdgeNearAnchors } from "./ped-edge-bias.ts";
import type { PedEdge } from "./ped-edges.ts";

const edges: PedEdge[] = [
  { ax: 0, az: 0, bx: 10, bz: 0 },
  { ax: 100, az: 100, bx: 110, bz: 100 },
];
const anchors = [{ x: 5, z: 1 }];

let calls = 0;
const rng = () => {
  calls += 1;
  // First call: chance check → always take bias; then pick anchor/edge indices.
  if (calls === 1) return 0.01;
  return 0.1;
};

const hit = pickEdgeNearAnchors(rng, edges, anchors, 1, 60);
assert.ok(hit);
assert.equal(hit!.ax, 0);

assert.equal(pickEdgeNearAnchors(() => 0.99, edges, anchors, 0.4, 60), null);

console.log("ped-edge-bias.test.ts ok");
