import { create } from "zustand";
import { decodeLook, encodeLook, type Look } from "@/avatar/appearance";
import { honk } from "@/game/audio";
import { live, pendingHits, selfSay } from "@/game/runtime";
import { useGame } from "@/game/store";
import { openTransport, type Transport, type TransportKind, type Wire } from "./transport";
import { setVoiceModeSender, voice } from "./voice";

type Snap = { t: number; x: number; z: number; yaw: number; speed: number };

export type Peer = {
  id: string;
  name: string;
  look: Look;
  snaps: Snap[];
  /** Interpolated render state, written by the remote-player component. */
  rx: number;
  rz: number;
  ryaw: number;
  rspeed: number;
  veh: number;
  seat: number;
  emote: number;
  emoteStart: number;
  rideWith: string | null;
  passenger: boolean;
  lastSeen: number;
  sampledAt: number;
  prevYaw: number;
  roll: number;
  chat: { text: string; until: number } | null;
  chatVersion: number;
};

export type ChatLine = { id: number; from: string; name: string; text: string; at: number; mine: boolean };

export type NetStatus = "idle" | "connecting" | "relay" | "local" | "reconnecting";

type NetState = {
  status: NetStatus;
  selfId: string;
  /** Mutable map. Components read it inside the frame loop, never via React state. */
  peerMap: Map<string, Peer>;
  /** Changes only on join / leave so lists re-render cheaply. */
  peerIds: string[];
  chat: ChatLine[];
};

export const useNet = create<NetState>(() => ({
  status: "idle",
  selfId: "",
  peerMap: new Map(),
  peerIds: [],
  chat: [],
}));

let transport: Transport | null = null;
let sweep: ReturnType<typeof setInterval> | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
let chatSeq = 0;
let session: { city: string; name: string; look: Look } | null = null;

const SNAP_KEEP = 8;
const STALE_MS = 9000;

function newId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

function refreshIds() {
  const { peerMap } = useNet.getState();
  useNet.setState({ peerIds: Array.from(peerMap.keys()) });
}

function makePeer(id: string, name: string, lookRaw: unknown): Peer {
  return {
    id,
    name: String(name ?? "Guest").slice(0, 16) || "Guest",
    look: decodeLook(lookRaw),
    snaps: [],
    rx: 0,
    rz: 0,
    ryaw: 0,
    rspeed: 0,
    veh: 0,
    seat: 0,
    emote: 0,
    emoteStart: 0,
    rideWith: null,
    passenger: false,
    lastSeen: performance.now(),
    sampledAt: -1,
    prevYaw: 0,
    roll: 0,
    chat: null,
    chatVersion: 0,
  };
}

function addChat(from: string, name: string, text: string, mine: boolean) {
  const line: ChatLine = { id: (chatSeq += 1), from, name, text, at: Date.now(), mine };
  useNet.setState((s) => ({ chat: [...s.chat.slice(-39), line] }));
}

function sendJoin(reply: boolean) {
  if (!transport || !session) return;
  const { selfId } = useNet.getState();
  const meet = useGame.getState().meetId;
  transport.send({
    t: "join",
    id: selfId,
    city: session.city,
    name: session.name,
    look: encodeLook(session.look),
    reply,
    meet: meet ?? 0,
  });
}

/** Tell the relay whether our mic is live (for “M talking” counts). */
export function sendVoiceMode(on: boolean): void {
  transport?.send({ t: "vm", on: on ? 1 : 0 });
}

function onMessage(msg: Wire, kind: TransportKind) {
  const state = useNet.getState();
  const map = state.peerMap;
  const id = typeof msg.id === "string" ? msg.id : "";
  const now = performance.now();

  switch (msg.t) {
    case "welcome": {
      const list = Array.isArray(msg.peers) ? (msg.peers as Record<string, unknown>[]) : [];
      for (const p of list) {
        if (typeof p.id === "string" && p.id !== state.selfId) map.set(p.id, makePeer(p.id, String(p.name), p.look));
      }
      refreshIds();
      break;
    }
    case "join": {
      if (!id || id === state.selfId) break;
      const known = map.get(id);
      if (known) {
        known.lastSeen = now;
      } else {
        map.set(id, makePeer(id, String(msg.name), msg.look));
        refreshIds();
      }
      // On the tab-to-tab transport there is no server to tell newcomers who is here.
      if (kind === "local" && !msg.reply) sendJoin(true);
      break;
    }
    case "s": {
      const p = map.get(id);
      const a = msg.p;
      if (!p || !Array.isArray(a) || a.length < 8) break;
      const x = Number(a[0]);
      const z = Number(a[1]);
      if (!Number.isFinite(x) || !Number.isFinite(z)) break;
      p.snaps.push({ t: now, x, z, yaw: Number(a[2]) || 0, speed: Number(a[3]) || 0 });
      if (p.snaps.length > SNAP_KEEP) p.snaps.shift();
      p.veh = Math.min(3, Math.max(0, Number(a[4]) | 0));
      p.seat = Math.min(5, Math.max(0, Number(a[5]) | 0));
      const emote = Math.min(6, Math.max(0, Number(a[6]) | 0));
      if (emote !== p.emote) p.emoteStart = now;
      p.emote = emote;
      p.rideWith = typeof a[7] === "string" ? a[7] : null;
      p.passenger = p.rideWith !== null;
      p.lastSeen = now;
      break;
    }
    case "hit": {
      const to = typeof msg.to === "string" ? msg.to : "";
      if (to !== state.selfId) break;
      const k = Number(msg.k) === 1 ? 1 : 0;
      pendingHits.push({ from: id || "peer", kind: k, at: now });
      if (pendingHits.length > 8) pendingHits.shift();
      break;
    }
    case "chat": {
      const p = map.get(id);
      const text = String(msg.m ?? "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 140);
      if (!p || !text) break;
      p.chat = { text, until: now + 6500 };
      p.chatVersion += 1;
      addChat(p.id, p.name, text, false);
      break;
    }
    case "h": {
      const p = map.get(id);
      if (!p || p.veh === 0) break;
      const d = Math.hypot(p.rx - live.x, p.rz - live.z);
      honk(p.veh, Math.max(0, 1 - d / 120));
      break;
    }
    case "leave": {
      if (map.delete(id)) refreshIds();
      voice.handleSignal({ t: "vx", id, to: state.selfId });
      break;
    }
    case "vo":
    case "va":
    case "vi":
    case "vx": {
      voice.handleSignal(msg);
      break;
    }
    case "tr": {
      if (id === state.selfId) break;
      const packed = msg.p;
      if (Array.isArray(packed) && onTraffic) onTraffic(id, packed as number[]);
      break;
    }
    default:
      break;
  }
}

export function connect(city: string, name: string, look: Look): void {
  disconnect();
  const selfId = newId();
  session = { city, name, look };
  useNet.setState({ status: "connecting", selfId, peerMap: new Map(), peerIds: [], chat: [] });

  transport = openTransport(city, selfId, {
    message: onMessage,
    open: (kind) => {
      useNet.setState({ status: kind === "ws" ? "relay" : "local" });
      voice.setSender(selfId, (msg) => transport?.send(msg));
      setVoiceModeSender(sendVoiceMode);
      sendJoin(false);
    },
    close: () => {
      voice.disable();
      useNet.getState().peerMap.clear();
      useNet.setState({ status: "reconnecting", peerIds: [] });
    },
  });
  voice.setSender(selfId, (msg) => transport?.send(msg));
  setVoiceModeSender(sendVoiceMode);

  // Drop peers that went silent (closed tab, lost connection).
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
  // Heartbeat so tab-to-tab peers can find each other even after missing a join.
  beat = setInterval(() => {
    if (useNet.getState().status === "local") sendJoin(true);
  }, 4000);
  window.addEventListener("pagehide", disconnect);
}

export function disconnect(): void {
  window.removeEventListener("pagehide", disconnect);
  voice.disable();
  onTraffic = null;
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
  useNet.setState({ status: "idle", peerMap: new Map(), peerIds: [] });
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function sendState(): void {
  if (!transport) return;
  transport.send({
    t: "s",
    p: [r2(live.x), r2(live.z), r2(live.yaw), r2(live.speed), live.vehicle, live.seat, live.emote, live.rideWith ?? 0],
  });
}

export function sendHonk(): void {
  transport?.send({ t: "h" });
}

/** Directed fight impulse — peer filters on `to`. kind 0 punch, 1 kick. */
export function sendHit(to: string, kind: 0 | 1): void {
  if (!transport || !to) return;
  transport.send({ t: "hit", to, k: kind });
}

export function sendChat(raw: string): void {
  const text = raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 140);
  if (!text || !session) return;
  transport?.send({ t: "chat", m: text });
  addChat(useNet.getState().selfId, session.name, text, true);
  selfSay.text = text;
  selfSay.until = performance.now() + 6500;
  selfSay.seq += 1;
  // Lazy import avoids cycle: vibe/store ↔ net
  void import("@/game/store").then(({ grantMission }) => grantMission("chat"));
}

/** Sparse traffic host snapshot: flat [index,x,z,yaw,speed, …]. */
export function sendTraffic(packed: number[]): void {
  if (!transport || packed.length < 5) return;
  transport.send({ t: "tr", p: packed });
}

type TrafficHandler = (from: string, packed: number[]) => void;
let onTraffic: TrafficHandler | null = null;

export function setTrafficHandler(fn: TrafficHandler | null): void {
  onTraffic = fn;
}
