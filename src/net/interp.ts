import { wrapAngle } from "@/lib/math";
import { isNetV2Enabled } from "@/game/sim/flags";
import { sampleRemoteHermite } from "@india-irl/network";
import type { Peer } from "./store";

const DELAY_MS = 110;
const MAX_EXTRAPOLATE_MS = 160;

/**
 * Snapshot interpolation: ~110 ms behind. netV2 uses Hermite on XZ;
 * legacy uses linear blend.
 */
export function samplePeer(p: Peer, now: number): void {
  if (p.sampledAt === now) return;
  p.sampledAt = now;
  const s = p.snaps;
  if (s.length === 0) return;

  if (isNetV2Enabled()) {
    const out = { x: p.rx, z: p.rz, yaw: p.ryaw, speed: p.rspeed };
    sampleRemoteHermite(s, now, out);
    p.rx = out.x;
    p.rz = out.z;
    p.ryaw = out.yaw;
    p.rspeed = out.speed;
    return;
  }

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
