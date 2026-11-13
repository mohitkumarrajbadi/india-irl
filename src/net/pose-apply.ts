/** Apply decoded pose fields onto a peer (shared by `s` and `sb`). */
import type { PoseFields } from "@india-irl/network";

const SNAP_KEEP = 8;

export type PosePeer = {
  snaps: { t: number; x: number; z: number; yaw: number; speed: number }[];
  veh: number;
  seat: number;
  emote: number;
  emoteStart: number;
  rideWith: string | null;
  passenger: boolean;
  lastSeen: number;
};

export function applyPoseToPeer(p: PosePeer, fields: PoseFields, now: number): void {
  if (!Number.isFinite(fields.x) || !Number.isFinite(fields.z)) return;
  p.snaps.push({
    t: now,
    x: fields.x,
    z: fields.z,
    yaw: fields.yaw || 0,
    speed: fields.speed || 0,
  });
  if (p.snaps.length > SNAP_KEEP) p.snaps.shift();
  p.veh = Math.min(3, Math.max(0, fields.veh | 0));
  p.seat = Math.min(5, Math.max(0, fields.seat | 0));
  const emote = Math.min(6, Math.max(0, fields.emote | 0));
  if (emote !== p.emote) p.emoteStart = now;
  p.emote = emote;
  p.rideWith = fields.rideWith;
  p.passenger = fields.rideWith !== null;
  p.lastSeen = now;
}
