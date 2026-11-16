import assert from "node:assert/strict";
import { ANIMAL_INFO } from "./animal-kinds.ts";
import { tickAnimal, scareAnimalHorn } from "./animal-tick.ts";
import { reactPedsToHorn, scareNearDriver } from "./ped-scare.ts";
import { rollPedIntent, type LoiterSpot } from "./ped-intent.ts";
import type { Ped } from "./pedestrians.ts";
import type { Animal } from "./animal-kinds.ts";

function stubPed(partial: Partial<Ped> = {}): Ped {
  return {
    x: 0, z: 0, y: 0, yaw: 0, speed: 1.2, phase: 0,
    skin: 0, top: 0, bottom: 0,
    ax: 0, az: 0, bx: 10, bz: 0, t: 0.5, dir: 1,
    courage: 0.4, mood: "walk", moodUntil: 0, fightCd: 0, downUntil: 0,
    vx: 0, vz: 0, vy: 0,
    intent: "patrol", intentUntil: 0, tx: 0, tz: 0, chatWith: -1,
    ...partial,
  };
}

const rng = () => 0.05;
const spots: LoiterSpot[] = [{ x: 2, z: 1 }];
const ped = stubPed();
rollPedIntent(ped, rng, 1000, 0.8, spots, [ped], 0);
assert.equal(ped.intent, "loiter");
assert.ok(Math.hypot(ped.tx - 2, ped.tz - 1) < 3);

const walkers = [stubPed({ x: 1, z: 0 }), stubPed({ x: 40, z: 0 })];
reactPedsToHorn(walkers, 0, 0, 5000, () => 0.1, 22);
assert.equal(walkers[0]!.mood, "flee");
assert.equal(walkers[1]!.mood, "walk");

const ahead = stubPed({ x: 0, z: 6 });
scareNearDriver([ahead], 0, 0, 0, 12, 2, 9000);
assert.equal(ahead.mood, "flee");

const cow: Animal = {
  kind: 0, tint: 0, scale: 1, x: 0, z: 0, y: 0, yaw: 0, speed: 0, phase: 0,
  mood: "idle", moodUntil: 0, tx: 3, tz: 0, hx: 0, hz: 0, leash: 14,
};
tickAnimal(cow, 0.05, 2, 0, 100, () => 0.5, 10);
assert.equal(cow.mood, "flee");
assert.ok(ANIMAL_INFO[0].radius > 0.5);

scareAnimalHorn(cow, 0, 0, 200, () => 0.1);
assert.equal(cow.mood, "flee");

// Dog chase: forced rng triggers approach on slow foot player.
const dog: Animal = {
  kind: 1, tint: 0, scale: 1, x: 6, z: 0, y: 0, yaw: 0, speed: 0, phase: 0,
  mood: "idle", moodUntil: 0, tx: 0, tz: 0, hx: 6, hz: 0, leash: 20,
};
tickAnimal(dog, 0.05, 0, 0, 1000, () => 0.005, 0.5);
assert.equal(dog.mood, "chase");

console.log("world-life.test.ts ok");
