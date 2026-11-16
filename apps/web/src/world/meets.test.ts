import assert from "node:assert/strict";
import {
  MEET_RADIUS,
  buildShareUrl,
  identityCaption,
  isCityId,
  localTitleFor,
  nearestMeet,
  parseDeepLink,
  resolveCityId,
  whatsappShareText,
} from "./meets.ts";

assert.equal(isCityId("novapura"), true);
assert.equal(isCityId("bengaluru"), false);
assert.equal(resolveCityId("bengaluru"), "novapura");
assert.equal(resolveCityId("gurugram"), "udyogabad");
assert.equal(isCityId("nyc"), false);

const centers = [
  { id: "a", label: "Alpha Plaza", x: 0, z: 0 },
  { id: "b", label: "Beta Gate", x: 100, z: 0 },
];
assert.equal(nearestMeet(5, 5, centers)?.id, "a");
assert.equal(nearestMeet(100, 0, centers)?.id, "b");
assert.equal(nearestMeet(200, 200, centers), null);
assert.ok(MEET_RADIUS === 40);

const link = parseDeepLink("?city=gurugram&meet=cyber-hub&join=abc123&plan=p9x");
assert.equal(link.city, "udyogabad");
assert.equal(link.meet, "hub-plaza");
assert.equal(link.join, "abc123");
assert.equal(link.plan, "p9x");
assert.equal(parseDeepLink("?city=novapura&meet=kaapi-block").city, "novapura");
assert.equal(parseDeepLink("?city=nope").city, null);

assert.equal(localTitleFor("Novapura", "Kaapi Block Plaza"), "Kaapi Local");
assert.equal(localTitleFor("Mandipura", null), "Mandipura Local");

const url = buildShareUrl({ origin: "http://localhost:3000/", city: "mandipura", meet: "book-street", join: "u1" });
assert.ok(url.includes("city=mandipura") && url.includes("meet=book-street") && url.includes("join=u1"));

const text = whatsappShareText({ cityName: "Neerabad", meetLabel: "Lake Towers", here: 6, talking: 2, url: "http://x" });
assert.ok(text.includes("6 here") && text.includes("2 talking"));
assert.ok(identityCaption("1.2.3").length > 8);

console.log("meets.test.ts ok");
