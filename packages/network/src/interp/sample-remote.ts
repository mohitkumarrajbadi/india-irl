/** Hermite remote pose sampler (15 Hz snaps → display). */
import { hermitePose, type PoseSample } from "./hermite.ts";

export type RemoteSnap = { t: number; x: number; z: number; yaw: number; speed: number };

export type RemotePose = { x: number; z: number; yaw: number; speed: number };

const DELAY_MS = 110;
const MAX_EXTRAPOLATE_MS = 160;

function wrapAngle(a: number): number {
  const t = a % (Math.PI * 2);
  return t > Math.PI ? t - Math.PI * 2 : t < -Math.PI ? t + Math.PI * 2 : t;
}

function toSample(s: RemoteSnap, prev: RemoteSnap | null): PoseSample {
  let vx = Math.sin(s.yaw) * s.speed;
  let vz = Math.cos(s.yaw) * s.speed;
  if (prev) {
    const dt = Math.max(1e-3, (s.t - prev.t) / 1000);
    vx = (s.x - prev.x) / dt;
    vz = (s.z - prev.z) / dt;
  }
  return { t: s.t / 1000, x: s.x, y: 0, z: s.z, vx, vy: 0, vz };
}

export function sampleRemoteHermite(snaps: readonly RemoteSnap[], nowMs: number, out: RemotePose): void {
  if (snaps.length === 0) return;
  const rt = nowMs - DELAY_MS;
  const last = snaps[snaps.length - 1];

  if (snaps.length === 1 || rt <= snaps[0].t) {
    const first = rt <= snaps[0].t ? snaps[0] : last;
    out.x = first.x;
    out.z = first.z;
    out.yaw = first.yaw;
    out.speed = first.speed;
    return;
  }
  if (rt >= last.t) {
    const dt = Math.min(rt - last.t, MAX_EXTRAPOLATE_MS) / 1000;
    out.x = last.x + Math.sin(last.yaw) * last.speed * dt;
    out.z = last.z + Math.cos(last.yaw) * last.speed * dt;
    out.yaw = last.yaw;
    out.speed = last.speed;
    return;
  }
  for (let i = snaps.length - 1; i > 0; i -= 1) {
    const a = snaps[i - 1];
    const b = snaps[i];
    if (rt < a.t) continue;
    const pa = toSample(a, i > 1 ? snaps[i - 2] : null);
    const pb = toSample(b, a);
    const p = hermitePose(pa, pb, rt / 1000);
    const k = (rt - a.t) / Math.max(1, b.t - a.t);
    out.x = p.x;
    out.z = p.z;
    out.yaw = a.yaw + wrapAngle(b.yaw - a.yaw) * k;
    out.speed = a.speed + (b.speed - a.speed) * k;
    return;
  }
}
