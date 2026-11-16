import assert from "node:assert/strict";
import { createTokenBucket, refillBucket, refund, tryConsume } from "./token-bucket.ts";

const b = createTokenBucket(80, 50, 0);
assert.equal(b.tokens, 80);
assert.equal(tryConsume(b), true);
assert.equal(b.tokens, 79);

for (let i = 0; i < 79; i += 1) assert.equal(tryConsume(b), true);
assert.equal(tryConsume(b), false);

refillBucket(b, 1000);
assert.ok(b.tokens >= 49 && b.tokens <= 51, `refill≈50 got ${b.tokens}`);

refund(b, 5);
assert.ok(b.tokens <= 80);

const tight = createTokenBucket(2, 0, 0);
assert.equal(tryConsume(tight, 2), true);
assert.equal(tryConsume(tight), false);

console.log("token-bucket.test.ts ok");
