import assert from "node:assert/strict";
import {
  fogDensity,
  headlightPower,
  lampGlow,
  mistOpacity,
  rainAudioMul,
  wetRoadParams,
} from "./atmosphere-fx.ts";

const dry = wetRoadParams(0);
const wet = wetRoadParams(1);
assert.ok(wet.roughness < dry.roughness);
assert.ok(wet.metalness > dry.metalness);
assert.ok(wet.metalness <= 0.1, "wet metalness must stay low to avoid white specular patches");
assert.ok(wet.colorMul < dry.colorMul);

const lamp = lampGlow(1, 0.8, 0.5);
assert.ok(lamp.poolOpacity > 0.35);
assert.ok(lamp.lightIntensity > 120, "streetlights need physical intensity under ACES");
assert.equal(lampGlow(0, 0, 0).lightIntensity, 0);
assert.ok(lampGlow(0.04, 0, 0).lightIntensity === 0);

assert.ok(fogDensity(0.01, 0.5, 0.5, 0.5) > fogDensity(0.01, 0, 0, 0));
assert.ok(headlightPower(0.2, 0.8, 0.2, 0.6) > headlightPower(0.2, 0, 0, 0));
assert.equal(mistOpacity(0, 0, 0), 0);
assert.ok(mistOpacity(0.6, 0.3, 0.5) > 0.1);
assert.ok(rainAudioMul(0.1, 0.8) > 0.3);

console.log("atmosphere-fx.test.ts ok");
