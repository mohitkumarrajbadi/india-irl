import assert from "node:assert/strict";
import { chassisVisual } from "./chassis-visual.ts";

const pristine = chassisVisual(1);
assert.equal(pristine.rustMix, 0);
assert.equal(pristine.scaleY, 1);
assert.equal(pristine.glassMul, 1);

const wrecked = chassisVisual(0);
assert.ok(wrecked.rustMix > 0.5);
assert.ok(wrecked.scaleY < 0.95);
assert.ok(wrecked.bodyRotZ > 0.03);
assert.ok(wrecked.glassMul < 0.5);

const mid = chassisVisual(0.5);
assert.ok(mid.rustMix > pristine.rustMix && mid.rustMix < wrecked.rustMix);
assert.ok(mid.scaleY < pristine.scaleY && mid.scaleY > wrecked.scaleY);

assert.equal(chassisVisual(-1).scaleY, wrecked.scaleY);
assert.equal(chassisVisual(2).scaleY, pristine.scaleY);

console.log("chassis-visual.test.ts ok");
