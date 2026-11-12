import assert from "node:assert/strict";
import { resolveCircle } from "./collision.ts";
import { StaticGrid } from "./spatial.ts";

const out = { x: 0, z: 0 };
const box = { minX: 10, maxX: 14, minZ: 0, maxZ: 3, h: 9 };
const post = { x: -5, z: 4, r: 0.3 };

resolveCircle(0, 0, 0.32, [box], [post], out);
assert.equal(out.x, 0);

resolveCircle(box.minX - 0.05, 1.5, 0.32, [box], [], out);
assert.ok(out.x <= box.minX - 0.32 + 1e-6, `expected push west, got ${out.x}`);

resolveCircle(post.x, post.z, 0.32, [], [post], out);
assert.ok(Math.hypot(out.x - post.x, out.z - post.z) >= 0.62 - 1e-6);

// The grid must agree with the brute-force answer everywhere.
const boxes = Array.from({ length: 400 }, (_, i) => {
  const x = (i % 20) * 30 - 300;
  const z = Math.floor(i / 20) * 30 - 300;
  return { minX: x, maxX: x + 12, minZ: z, maxZ: z + 9, h: 20 };
});
const circles = Array.from({ length: 300 }, (_, i) => ({ x: (i % 17) * 35 - 290, z: Math.floor(i / 17) * 33 - 280, r: 0.4 }));
const grid = new StaticGrid(boxes, circles, { minX: -320, maxX: 320, minZ: -320, maxZ: 320 });
const a = { x: 0, z: 0 };
const b = { x: 0, z: 0 };
let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
for (let i = 0; i < 4000; i += 1) {
  const x = rand() * 640 - 320;
  const z = rand() * 640 - 320;
  resolveCircle(x, z, 0.9, boxes, circles, a);
  grid.resolve(x, z, 0.9, b);
  assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9, `grid mismatch at ${x},${z}`);
}
assert.equal(grid.blocked(-299, 5, -299), true);
assert.equal(grid.blocked(-299, 25, -299), false);

console.log("collision checks passed");
