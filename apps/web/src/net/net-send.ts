import { encodeLook, type Look } from "@/avatar/appearance";
import { live, selfSay } from "@/game/runtime";
import { useGame } from "@/game/store";
import { isNetV2Enabled } from "@/game/sim/flags";
import { encodePoseBase64 } from "./net-codec";
import { addChat, useNet } from "./net-peers";
import type { Transport } from "./transport";
import { buildClaimMessage, type ClaimFreeExtra } from "./vehicle-claim-wire";

export type Session = { city: string; name: string; look: Look };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function sendJoin(transport: Transport | null, session: Session | null, reply: boolean): void {
  if (!transport || !session) return;
  const { selfId } = useNet.getState();
  const { meetId, cityId } = useGame.getState();
  transport.send({
    t: "join",
    id: selfId,
    city: session.city,
    destCity: cityId,
    name: session.name,
    look: encodeLook(session.look),
    reply,
    meet: meetId ?? 0,
  });
}

export function sendVoiceMode(transport: Transport | null, on: boolean): void {
  transport?.send({ t: "vm", on: on ? 1 : 0 });
}

export function sendState(transport: Transport | null): void {
  if (!transport) return;
  if (isNetV2Enabled()) {
    void sendStateBinary(transport);
    return;
  }
  transport.send({
    t: "s",
    p: [r2(live.x), r2(live.z), r2(live.yaw), r2(live.speed), live.vehicle, live.seat, live.emote, live.rideWith ?? 0],
  });
}

async function sendStateBinary(transport: Transport): Promise<void> {
  const b = await encodePoseBase64({
    x: live.x,
    z: live.z,
    yaw: live.yaw,
    speed: live.speed,
    veh: live.vehicle,
    seat: live.seat,
    emote: live.emote,
    rideWith: live.rideWith,
  });
  transport.send({ t: "sb", b });
}

export function sendHonk(transport: Transport | null): void {
  transport?.send({ t: "h" });
}

export function sendHit(transport: Transport | null, to: string, kind: 0 | 1): void {
  if (!transport || !to) return;
  transport.send({ t: "hit", to, k: kind });
}

export function sendChat(transport: Transport | null, session: Session | null, raw: string): void {
  const text = raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 140);
  if (!text || !session) return;
  transport?.send({ t: "chat", m: text });
  addChat(useNet.getState().selfId, session.name, text, true);
  selfSay.text = text;
  selfSay.until = performance.now() + 6500;
  selfSay.seq += 1;
  void import("@/game/store").then(({ grantMission }) => grantMission("chat"));
}

export function sendTraffic(transport: Transport | null, packed: number[]): void {
  if (!transport || packed.length < 5) return;
  transport.send({ t: "tr", p: packed });
}

/** Parked (`p`) or traffic (`t`) vehicle claim / free. Optional wreck pose on free. */
export function sendClaim(
  transport: Transport | null,
  kind: "p" | "t",
  index: number,
  free = false,
  extra?: ClaimFreeExtra,
): void {
  if (!transport) return;
  transport.send(buildClaimMessage(kind, index, free, extra));
}
