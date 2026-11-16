import assert from "node:assert/strict";
import { endowmentTargetXp, comebackCopy } from "./onboarding.ts";
import { xpForLevel } from "./vibe.ts";

assert.equal(endowmentTargetXp(), Math.floor(xpForLevel(1) * 0.45));
assert.ok(endowmentTargetXp() > 0 && endowmentTargetXp() < xpForLevel(1));

const copy = comebackCopy("Kaapi Block");
assert.ok(copy.includes("8pm IST") && copy.includes("Kaapi Block"));
assert.ok(comebackCopy("").includes("your plaza"));

console.log("onboarding.test.ts ok");
