import assert from "node:assert/strict";
import { CITIES, CITY_IDS } from "./cities.ts";
import { blockAt, districtNameAt, generateCity } from "./generate.ts";

for (const id of CITY_IDS) {
  const t0 = performance.now();
  const city = generateCity(CITIES[id]);
  const ms = performance.now() - t0;

  const again = generateCity(CITIES[id]);
  assert.equal(JSON.stringify(city.buildings.slice(0, 50)), JSON.stringify(again.buildings.slice(0, 50)), `${id} must be deterministic`);

  assert.ok(city.buildings.length > 600, `${id}: only ${city.buildings.length} buildings`);
  assert.equal(city.blocks.length, CITIES[id].cols * CITIES[id].rows);

  // No ground-level building may leave its block (which would put it on a road).
  for (const bd of city.buildings) {
    if (bd.y > 0) continue;
    const blk = blockAt(city, bd.x, bd.z);
    assert.ok(bd.x - bd.w / 2 >= blk.minX - 1e-6 && bd.x + bd.w / 2 <= blk.maxX + 1e-6, `${id}: building leaves block in x`);
    assert.ok(bd.z - bd.d / 2 >= blk.minZ - 1e-6 && bd.z + bd.d / 2 <= blk.maxZ + 1e-6, `${id}: building leaves block in z`);
  }

  // Landmark blocks stay free of ordinary buildings.
  for (const lm of city.landmarks) {
    const inside = city.buildings.filter((bd) => {
      const blk = blockAt(city, bd.x, bd.z);
      return blk.bi === lm.spec.bi && blk.bj === lm.spec.bj;
    });
    assert.equal(inside.length, 0, `${id}: ${lm.spec.label} block has buildings`);
  }

  assert.ok(city.metroPillars.length > 8, `${id}: metro pillars missing`);
  assert.ok(city.trees.length > 100);
  assert.ok(districtNameAt(city, city.spawn.x, city.spawn.z).length > 0);
  const fringe = city.blocks.filter((b) => b.fringe).length;
  assert.ok(fringe >= 4, `${id}: expected irregular fringe parks, got ${fringe}`);
  assert.ok(city.strays.length >= CITIES[id].dogs + CITIES[id].goats - 1, `${id}: strays missing`);
  const signals = city.extras.filter((e) => e.v === 6).length;
  assert.ok(signals >= 2, `${id}: expected traffic signals, got ${signals}`);
  console.log(`${id}: ${city.buildings.length} buildings, ${city.trees.length} trees, fringe ${fringe}, signals ${signals}, strays ${city.strays.length}, ${ms.toFixed(1)} ms`);
}
console.log("world checks passed");
