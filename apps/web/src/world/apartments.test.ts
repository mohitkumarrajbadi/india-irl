import assert from "node:assert/strict";
import { CITIES } from "./cities.ts";
import { generateCity } from "./generate.ts";
import { apartmentsFromCity, nearestApartment } from "./apartments.ts";

const city = generateCity(CITIES.novapura);
const apts = apartmentsFromCity(city);
assert.ok(apts.length >= 1, "at least one flat");
assert.ok(apts.length <= 6);
assert.ok(apts.every((a) => a.half > 2 && a.id.startsWith("apt-")));

const a = apts[0]!;
assert.equal(nearestApartment(a.x, a.z, apts)?.id, a.id);
assert.equal(nearestApartment(a.x + 80, a.z + 80, apts), null);

console.log("apartments.test.ts ok");
