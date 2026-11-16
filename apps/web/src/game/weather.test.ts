import assert from "node:assert/strict";
import {
  cycleWeather,
  setWeather,
  tickWeather,
  weather,
  wetDragMul,
  wetGripMul,
  weatherLabel,
} from "./weather.ts";

setWeather("clear");
tickWeather(1, 12, "novapura", false);
assert.ok(weather.rain < 0.05);
assert.ok(wetGripMul() > 0.95);

setWeather("rain");
for (let i = 0; i < 40; i += 1) tickWeather(0.1, 16, "novapura", false);
assert.ok(weather.rain > 0.4);
assert.ok(weather.wet > 0.25);
assert.ok(wetGripMul() < 0.9);
assert.ok(wetDragMul() > 1);

const label = cycleWeather();
assert.ok(typeof label === "string" && label.length > 0);
assert.equal(weatherLabel("storm"), "Storm");

console.log("weather.test.ts ok");
