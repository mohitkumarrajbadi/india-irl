import { create } from "zustand";
import { decodeLook } from "@/avatar/appearance";
import type { ChatLine, NetState, Peer } from "./net-types";

export const useNet = create<NetState>(() => ({
  status: "idle",
  selfId: "",
  peerMap: new Map(),
  peerIds: [],
  chat: [],
}));

let chatSeq = 0;

export function refreshIds(): void {
  const { peerMap } = useNet.getState();
  useNet.setState({ peerIds: Array.from(peerMap.keys()) });
}

export function makePeer(id: string, name: string, lookRaw: unknown): Peer {
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

export function addChat(from: string, name: string, text: string, mine: boolean): void {
  const line: ChatLine = { id: (chatSeq += 1), from, name, text, at: Date.now(), mine };
  useNet.setState((s) => ({ chat: [...s.chat.slice(-39), line] }));
}

export function newId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}
