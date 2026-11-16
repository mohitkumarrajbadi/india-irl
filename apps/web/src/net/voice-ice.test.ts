import assert from "node:assert/strict";
import { buildIceServers } from "./voice-ice.ts";

const stunOnly = buildIceServers({});
assert.equal(stunOnly.length, 1);
assert.ok(String(stunOnly[0]!.urls).includes("stun:"));

const withTurn = buildIceServers({
  turnUrls: "turn:turn.example:3478,turns:turn.example:5349",
  turnUsername: "u",
  turnCredential: "p",
});
assert.equal(withTurn.length, 2);
const turn = withTurn[1]!;
assert.deepEqual(turn.urls, ["turn:turn.example:3478", "turns:turn.example:5349"]);
assert.equal(turn.username, "u");
assert.equal(turn.credential, "p");

const noCred = buildIceServers({ turnUrls: "turn:x:3478" });
assert.equal(noCred.length, 2);
assert.equal(noCred[1]!.username, undefined);

console.log("voice-ice.test.ts ok");
