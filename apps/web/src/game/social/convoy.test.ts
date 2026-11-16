import assert from "node:assert/strict";
import {
  applyConvoyMessage,
  convoyInvite,
  convoyLeave,
  convoyMarkerBearing,
  convoyRegroup,
  convoyState,
  resetConvoy,
  setConvoySender,
} from "./convoy.ts";

const sent: Record<string, unknown>[] = [];
setConvoySender((m) => sent.push(m), "self");
resetConvoy();
sent.length = 0;

assert.equal(convoyInvite("self"), "No one nearby");
assert.equal(convoyInvite("peer1"), "Convoy invite sent");
assert.equal(convoyState().hostId, "self");
assert.equal(sent[0]?.op, "invite");

assert.equal(convoyRegroup(10, 20, "Plaza"), "Regroup · Plaza");
assert.ok(convoyState().marker);
const bear = convoyMarkerBearing(10, 10, 0);
assert.ok(bear && bear.dist > 9 && bear.dist < 11);

assert.equal(convoyLeave(), "Left convoy");
assert.equal(convoyState().hostId, null);

resetConvoy();
setConvoySender((m) => sent.push(m), "self");
const toast = applyConvoyMessage({ op: "invite", to: "self" }, "hostA");
assert.ok(toast?.includes("invite"));
assert.equal(convoyState().pendingFrom, "hostA");
assert.equal(convoyInvite("hostA"), "Joined convoy");
assert.equal(convoyState().hostId, "hostA");

console.log("convoy.test.ts ok");
