import assert from "node:assert/strict";
import { sample } from "./field.ts";
import { meshScene, type SdfMesh } from "./nets.ts";
import { SdfScene } from "./scene.ts";

/** Every edge must be shared by exactly two triangles, in opposite directions. */
function assertWatertight(m: SdfMesh, label: string): void {
  const edges = new Map<number, number>();
  const n = m.pos.length / 3;
  for (let t = 0; t < m.idx.length; t += 3) {
    for (let e = 0; e < 3; e += 1) {
      const a = m.idx[t + e], b = m.idx[t + ((e + 1) % 3)];
      assert.ok(a >= 0 && b >= 0 && a < n && b < n, `${label}: index out of range`);
      edges.set(a * n + b, (edges.get(a * n + b) ?? 0) + 1);
    }
  }
  for (const [key, uses] of edges) {
    const a = Math.floor(key / n), b = key % n;
    assert.equal(uses, 1, `${label}: edge ${a}-${b} used ${uses}x in one direction`);
    assert.equal(edges.get(b * n + a), 1, `${label}: edge ${a}-${b} has no opposite half-edge`);
  }
}

/** Signed volume is positive only when triangles wind outward. */
function volume(m: SdfMesh): number {
  let v = 0;
  const p = m.pos;
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.idx[t] * 3, b = m.idx[t + 1] * 3, c = m.idx[t + 2] * 3;
    v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
      - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c])
      + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v / 6;
}

// Sphere: closed, outward, right size, radial normals.
const ball = meshScene(new SdfScene().ball(0.5, { pos: [0.1, -0.2, 0.3] }), 0.05);
assertWatertight(ball, "ball");
const expected = (4 / 3) * Math.PI * 0.5 ** 3;
assert.ok(Math.abs(volume(ball) - expected) / expected < 0.03, `ball volume ${volume(ball)} vs ${expected}`);
for (let v = 0; v < ball.pos.length; v += 3) {
  const x = ball.pos[v] - 0.1, y = ball.pos[v + 1] + 0.2, z = ball.pos[v + 2] - 0.3;
  const r = Math.hypot(x, y, z);
  assert.ok(Math.abs(r - 0.5) < 0.004, `vertex off the sphere: r=${r}`);
  const dot = (x * ball.nrm[v] + y * ball.nrm[v + 1] + z * ball.nrm[v + 2]) / r;
  assert.ok(dot > 0.995, `normal not radial: ${dot}`);
}

// Primitive distances agree with geometry.
const prims = new SdfScene().box([1, 0.5, 0.25], 0.1, { pos: [3, 0, 0], rot: [0, 0, Math.PI / 2] });
assert.ok(Math.abs(sample(prims, 3, 1.5, 0) - 0.5) < 1e-9, "rotated box distance along its long axis");
assert.ok(Math.abs(sample(prims, 3.75, 0, 0) - 0.25) < 1e-9, "rotated box distance along its short axis");
const cone = new SdfScene().cone([0, 0, 0], [0, 2, 0], 0.5, 0.2);
assert.ok(Math.abs(sample(cone, 0, -1, 0) - 0.5) < 1e-9, "cone cap a");
assert.ok(Math.abs(sample(cone, 0, 3, 0) - 0.8) < 1e-9, "cone cap b");
assert.ok(sample(cone, 0, 1, 0) < 0, "cone interior");
assert.ok(Math.abs(sample(new SdfScene().torus(1, 0.25), 1.5, 0, 0) - 0.25) < 1e-9, "torus");
assert.ok(Math.abs(sample(new SdfScene().cyl(0.5, 1, 0.1), 0, 1.4, 0) - 0.4) < 1e-9, "cylinder");

// Smooth union + carve + mirror: still watertight, symmetric, two paint slots.
const blob = new SdfScene()
  .ellipsoid([0.3, 0.4, 0.3])
  .ball(0.15, { pos: [0.28, 0.1, 0], k: 0.08, slot: 1, sym: true })
  .box([0.1, 0.1, 0.4], 0.03, { pos: [0, -0.2, 0.3], cut: true, k: 0.03 })
  .tint([0.1, 0.1, 0.1], 2, 0.02, { pos: [0, 0.4, 0] });
const m = meshScene(blob, 0.03);
assertWatertight(m, "blob");
assert.ok(volume(m) > 0, "blob winds outward");
assert.equal(m.slots, 3);
let minX = 0, maxX = 0, slot1 = 0, slot2 = 0;
for (let v = 0; v < m.pos.length / 3; v += 1) {
  minX = Math.min(minX, m.pos[v * 3]);
  maxX = Math.max(maxX, m.pos[v * 3]);
  const sum = m.w[v * 3] + m.w[v * 3 + 1] + m.w[v * 3 + 2];
  assert.ok(Math.abs(sum - 1) < 1e-4, `paint weights must sum to 1, got ${sum}`);
  if (m.w[v * 3 + 1] > 0.9) slot1 += 1;
  if (m.w[v * 3 + 2] > 0.9) slot2 += 1;
}
assert.ok(Math.abs(minX + maxX) < 0.01, `mirror should be symmetric: ${minX} / ${maxX}`);
assert.ok(maxX > 0.4, "mirrored balls extend the shape");
assert.ok(slot1 > 20 && slot2 > 3, `expected painted regions, got ${slot1} / ${slot2}`);
assert.ok(sample(blob, 0, -0.2, 0.25) > 0, "carved region is empty");

console.log("sdf nets.test.ts ok");
