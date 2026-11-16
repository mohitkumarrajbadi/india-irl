import assert from "node:assert/strict";
import { novapura } from "./city-novapura.ts";
import { generateCity } from "./generate.ts";
import { forwardGrade, heightAt, regionAt, sampleTerrain } from "./terrain-sample.ts";
import { terrainProfile } from "./terrain-profile.ts";
import { driveGrade } from "./terrain-drive.ts";

const city = generateCity(novapura);
const prof = terrainProfile("novapura");
assert.ok(prof.hillRise > 30);

const midX = (city.bounds.minX + city.bounds.maxX) * 0.5;
const midZ = (city.bounds.minZ + city.bounds.maxZ) * 0.5;
assert.ok(heightAt(city, midX, midZ) < 1.2, "urban core stays flat");
assert.equal(regionAt(city, midX, midZ) === "urban" || regionAt(city, midX, midZ) === "suburban", true);

// North apron toward Nandi-style hills
const northZ = city.bounds.minZ - 120;
const hy = heightAt(city, midX, northZ);
assert.ok(hy > 4, `expected hill rise, got ${hy}`);
assert.equal(regionAt(city, midX, northZ), "hills");

const sample = sampleTerrain(city, midX, northZ);
assert.ok(sample.grip <= 1);
assert.ok(Math.hypot(sample.gradX, sample.gradZ) >= 0);
const g = driveGrade(sample, 0);
assert.equal(g, forwardGrade(sample, 0));

// Outer arterial highway band
let foundHighway = false;
for (const r of city.roadsX) {
  if (!r.arterial) continue;
  const x = r.c;
  const z = city.zs[0]! + 2;
  if (regionAt(city, x, z) === "highway") {
    foundHighway = true;
    break;
  }
}
assert.ok(foundHighway || regionAt(city, city.bounds.minX - 30, midZ) === "village");

console.log("terrain-sample.test.ts ok");
