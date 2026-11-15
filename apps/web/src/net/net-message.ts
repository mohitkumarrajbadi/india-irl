import { honk } from "@/game/audio";
import { live, pendingHits } from "@/game/runtime";
import { handleCardMessage } from "@/game/social/card-wire";
import { decodePoseBase64Sync } from "./net-codec";
import { addChat, makePeer, refreshIds, useNet } from "./net-peers";
import type { TrafficHandler } from "./net-types";
import { applyPoseToPeer } from "./pose-apply";
import type { TransportKind, Wire } from "./transport";
import { voice } from "./voice";

let onTraffic: TrafficHandler | null = null;

export function setTrafficHandler(fn: TrafficHandler | null): void {
  onTraffic = fn;
}

export function clearTrafficHandler(): void {
  onTraffic = null;
}

export function onMessage(msg: Wire, kind: TransportKind, sendJoin: (reply: boolean) => void): void {
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
      if (kind === "local" && !msg.reply) sendJoin(true);
      break;
    }
    case "s": {
      const p = map.get(id);
      const a = msg.p;
      if (!p || !Array.isArray(a) || a.length < 8) break;
      applyPoseToPeer(
        p,
        {
          x: Number(a[0]),
          z: Number(a[1]),
          yaw: Number(a[2]) || 0,
          speed: Number(a[3]) || 0,
          veh: Number(a[4]) | 0,
          seat: Number(a[5]) | 0,
          emote: Number(a[6]) | 0,
          rideWith: typeof a[7] === "string" ? a[7] : null,
        },
        now,
      );
      break;
    }
    case "sb": {
      const p = map.get(id);
      if (!p || typeof msg.b !== "string") break;
      const fields = decodePoseBase64Sync(msg.b);
      if (fields) applyPoseToPeer(p, fields, now);
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
    case "card": {
      const peer = map.get(id);
      handleCardMessage(msg, id, peer?.name ?? "Peer", state.selfId);
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
