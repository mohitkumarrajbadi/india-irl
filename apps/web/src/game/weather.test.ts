import assert from "node:assert/strict";
import {
  cycleWeather,
  resetWeatherAuto,
  setWeather,
  tickWeather,
  weather,
  wetDragMul,
  wetGripMul,
  weatherLabel,
} from "./weather.ts";

resetWeatherAuto();
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

// Auto interval is fixed once scheduled — many short ticks must not fire early
resetWeatherAuto();
setWeather("clear");
for (let i = 0; i < 200; i += 1) tickWeather(0.1, 16, "novapura", true);
assert.equal(weather.id, "clear", "auto must not fire before ~40s");

// After enough time, monsoon afternoon can shift (seeded, so either haze/drizzle or still clear)
resetWeatherAuto();
setWeather("clear");
for (let i = 0; i < 600; i += 1) tickWeather(0.1, 16, "novapura", true);
assert.ok(["clear", "haze", "drizzle"].includes(weather.id));

const label = cycleWeather();
assert.ok(typeof label === "string" && label.length > 0);
assert.equal(weatherLabel("storm"), "Storm");

console.log("weather.test.ts ok");
