import type { Look } from "@/avatar/appearance";

export type Snap = { t: number; x: number; z: number; yaw: number; speed: number };

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

export type NetState = {
  status: NetStatus;
  selfId: string;
  /** Mutable map. Components read it inside the frame loop, never via React state. */
  peerMap: Map<string, Peer>;
  /** Changes only on join / leave so lists re-render cheaply. */
  peerIds: string[];
  chat: ChatLine[];
};

export type TrafficHandler = (from: string, packed: number[]) => void;
