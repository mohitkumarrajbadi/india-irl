import { wrapAngle } from "@/lib/math";
import type { Peer } from "./store";

const DELAY_MS = 110;
const MAX_EXTRAPOLATE_MS = 160;

/**
 * Snapshot interpolation: render each peer ~110 ms in the past so there are
 * usually two real snapshots to blend between. Past the newest one, dead-reckon
 * along the last heading for a short while rather than freezing.
 */
export function samplePeer(p: Peer, now: number): void {
  if (p.sampledAt === now) return;
  p.sampledAt = now;
  const s = p.snaps;
  if (s.length === 0) return;
  const rt = now - DELAY_MS;
  const last = s[s.length - 1];

  if (s.length === 1 || rt <= s[0].t) {
    const first = rt <= s[0].t ? s[0] : last;
    p.rx = first.x;
    p.rz = first.z;
    p.ryaw = first.yaw;
    p.rspeed = first.speed;
    return;
  }
  if (rt >= last.t) {
    const dt = Math.min(rt - last.t, MAX_EXTRAPOLATE_MS) / 1000;
    p.rx = last.x + Math.sin(last.yaw) * last.speed * dt;
    p.rz = last.z + Math.cos(last.yaw) * last.speed * dt;
    p.ryaw = last.yaw;
    p.rspeed = last.speed;
    return;
  }
  for (let i = s.length - 1; i > 0; i -= 1) {
    const a = s[i - 1];
    const b = s[i];
    if (rt >= a.t) {
      const k = (rt - a.t) / Math.max(1, b.t - a.t);
      p.rx = a.x + (b.x - a.x) * k;
      p.rz = a.z + (b.z - a.z) * k;
      p.ryaw = a.yaw + wrapAngle(b.yaw - a.yaw) * k;
      p.rspeed = a.speed + (b.speed - a.speed) * k;
      return;
    }
  }
}
