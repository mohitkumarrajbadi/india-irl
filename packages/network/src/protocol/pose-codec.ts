/**
 * Fixed binary pose packet (little-endian).
 * Layout (37 bytes):
 *  0 ver:u8=1
 *  1 veh:u8  2 seat:u8  3 emote:u8
 *  4 x:f32  8 z:f32  12 yaw:f32  16 speed:f32
 *  20 rideFlag:u8  21..36 rideId ascii (16, NUL-padded)
 */
export const POSE_VER = 1;
export const POSE_BYTES = 37;
export const RIDE_CHARS = 16;

export type PoseFields = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  veh: number;
  seat: number;
  emote: number;
  rideWith: string | null;
};

export function encodePose(p: PoseFields, out = new Uint8Array(POSE_BYTES)): Uint8Array {
  const view = new DataView(out.buffer, out.byteOffset, POSE_BYTES);
  view.setUint8(0, POSE_VER);
  view.setUint8(1, p.veh & 3);
  view.setUint8(2, p.seat & 7);
  view.setUint8(3, p.emote & 7);
  view.setFloat32(4, p.x, true);
  view.setFloat32(8, p.z, true);
  view.setFloat32(12, p.yaw, true);
  view.setFloat32(16, p.speed, true);
  const ride = p.rideWith ?? "";
  view.setUint8(20, ride ? 1 : 0);
  for (let i = 0; i < RIDE_CHARS; i += 1) {
    out[21 + i] = i < ride.length ? ride.charCodeAt(i) & 0x7f : 0;
  }
  return out;
}

export function decodePose(buf: ArrayBuffer | Uint8Array): PoseFields | null {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.byteLength < POSE_BYTES) return null;
  const view = new DataView(u8.buffer, u8.byteOffset, POSE_BYTES);
  if (view.getUint8(0) !== POSE_VER) return null;
  let rideWith: string | null = null;
  if (view.getUint8(20) === 1) {
    let s = "";
    for (let i = 0; i < RIDE_CHARS; i += 1) {
      const c = u8[21 + i];
      if (!c) break;
      s += String.fromCharCode(c);
    }
    rideWith = s || null;
  }
  return {
    x: view.getFloat32(4, true),
    z: view.getFloat32(8, true),
    yaw: view.getFloat32(12, true),
    speed: view.getFloat32(16, true),
    veh: view.getUint8(1),
    seat: view.getUint8(2),
    emote: view.getUint8(3),
    rideWith,
  };
}

export function poseToBase64(p: PoseFields): string {
  const bytes = encodePose(p);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function poseFromBase64(b64: string): PoseFields | null {
  try {
    const raw = atob(b64);
    if (raw.length < POSE_BYTES) return null;
    const u8 = new Uint8Array(POSE_BYTES);
    for (let i = 0; i < POSE_BYTES; i += 1) u8[i] = raw.charCodeAt(i);
    return decodePose(u8);
  } catch {
    return null;
  }
}
