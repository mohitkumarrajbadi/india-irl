import type { Look } from "@/avatar/appearance";
import { setCardSender } from "@/game/social/card-wire";
import { disposeNetCodec } from "./net-codec";
import { clearTrafficHandler, onMessage, setTrafficHandler } from "./net-message";
import { newId, refreshIds, useNet } from "./net-peers";
import {
  sendChat as sendChatRaw,
  sendClaim as sendClaimRaw,
  sendHit as sendHitRaw,
  sendHonk as sendHonkRaw,
  sendJoin,
  sendState as sendStateRaw,
  sendTraffic as sendTrafficRaw,
  sendVoiceMode as sendVoiceModeRaw,
  type Session,
} from "./net-send";
import { openTransport, type Transport } from "./transport";
import { resetApartment, setApartmentSender } from "@/game/apartment";
import { resetConvoy, setConvoySender } from "@/game/social/convoy";
import { setBreakSender } from "./destructible-breaks";
import { setClaimSender } from "./vehicle-claims";
import { setVoiceModeSender, voice } from "./voice";

export type { ChatLine, NetStatus, Peer } from "./net-types";
export { useNet } from "./net-peers";
export { setTrafficHandler } from "./net-message";

let transport: Transport | null = null;
let sweep: ReturnType<typeof setInterval> | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
let session: Session | null = null;

const STALE_MS = 9000;

const join = (reply: boolean) => sendJoin(transport, session, reply);

/** Tell the relay whether our mic is live (for “M talking” counts). */
export function sendVoiceMode(on: boolean): void {
  sendVoiceModeRaw(transport, on);
}

export function connect(city: string, name: string, look: Look): void {
  disconnect();
  const selfId = newId();
  session = { city, name, look };
  useNet.setState({ status: "connecting", selfId, peerMap: new Map(), peerIds: [], chat: [] });

  transport = openTransport(city, selfId, {
    message: (msg, kind) => onMessage(msg, kind, join),
    open: (kind) => {
      useNet.setState({ status: kind === "ws" ? "relay" : "local" });
      voice.setSender(selfId, (msg) => transport?.send(msg));
      setVoiceModeSender(sendVoiceMode);
      setCardSender((msg) => transport?.send(msg));
      setClaimSender((msg) => transport?.send(msg));
      setBreakSender((msg) => transport?.send(msg));
      setConvoySender((msg) => transport?.send(msg), selfId);
      setApartmentSender((msg) => transport?.send(msg), selfId);
      join(false);
    },
    close: () => {
      voice.disable();
      resetConvoy();
      resetApartment();
      useNet.getState().peerMap.clear();
      useNet.setState({ status: "reconnecting", peerIds: [] });
    },
  });
  voice.setSender(selfId, (msg) => transport?.send(msg));
  setVoiceModeSender(sendVoiceMode);
  setClaimSender((msg) => transport?.send(msg));
  setBreakSender((msg) => transport?.send(msg));
  setConvoySender((msg) => transport?.send(msg), selfId);
  setApartmentSender((msg) => transport?.send(msg), selfId);

  sweep = setInterval(() => {
    const { peerMap } = useNet.getState();
    const now = performance.now();
    let changed = false;
    peerMap.forEach((p, key) => {
      if (now - p.lastSeen > STALE_MS) {
        peerMap.delete(key);
        changed = true;
      }
    });
    if (changed) refreshIds();
  }, 2000);
  beat = setInterval(() => {
    if (useNet.getState().status === "local") join(true);
  }, 4000);
  window.addEventListener("pagehide", disconnect);
}

export function disconnect(): void {
  window.removeEventListener("pagehide", disconnect);
  voice.disable();
  resetConvoy();
  resetApartment();
  clearTrafficHandler();
  if (transport) {
    const { selfId } = useNet.getState();
    transport.send({ t: "leave", id: selfId });
    transport.close();
  }
  transport = null;
  session = null;
  if (sweep) clearInterval(sweep);
  if (beat) clearInterval(beat);
  sweep = beat = null;
  disposeNetCodec();
  useNet.setState({ status: "idle", peerMap: new Map(), peerIds: [] });
}

export function sendState(): void {
  sendStateRaw(transport);
}

export function sendHonk(): void {
  sendHonkRaw(transport);
}

/** Directed fight impulse — peer filters on `to`. kind 0 punch, 1 kick. */
export function sendHit(to: string, kind: 0 | 1): void {
  sendHitRaw(transport, to, kind);
}

export function sendChat(raw: string): void {
  sendChatRaw(transport, session, raw);
}

/** Sparse traffic host snapshot: flat [index,x,z,yaw,speed, …]. */
export function sendTraffic(packed: number[]): void {
  sendTrafficRaw(transport, packed);
}

/** Claim or free a parked (`p`) / traffic (`t`) vehicle for peers. */
export function sendClaim(
  kind: "p" | "t",
  index: number,
  free = false,
  extra?: { wreck?: boolean; x?: number; z?: number; yaw?: number },
): void {
  sendClaimRaw(transport, kind, index, free, extra);
}
