/** Pack entity transforms into transferable SNAPSHOT SoA. */
import { SNAP_FLAGS, SNAP_STRIDE } from "./protocol.ts";
import type { CharState } from "./character.ts";
import type { RaycastVehicleController } from "./vehicle-controller.ts";

export const MAX_ENTITIES = 512;

export type VehSnap = {
  id: number;
  kind: number;
  controller: RaycastVehicleController;
};

export function packSnapshot(
  buf: Float32Array,
  chars: Iterable<CharState>,
  vehicles: Iterable<VehSnap>,
): { count: number; copy: Float32Array } {
  let n = 0;
  const write = (
    id: number,
    kind: number,
    x: number,
    y: number,
    z: number,
    qx: number,
    qy: number,
    qz: number,
    qw: number,
    speed: number,
    flags: number,
  ) => {
    if (n >= MAX_ENTITIES) return;
    const o = n * SNAP_STRIDE;
    buf[o] = id;
    buf[o + 1] = kind;
    buf[o + 2] = x;
    buf[o + 3] = y;
    buf[o + 4] = z;
    buf[o + 5] = qx;
    buf[o + 6] = qy;
    buf[o + 7] = qz;
    buf[o + 8] = qw;
    buf[o + 9] = speed;
    buf[o + 10] = flags;
    n += 1;
  };

  for (const ch of chars) {
    const t = ch.body.translation();
    const r = ch.body.rotation();
    let flags = SNAP_FLAGS.grounded;
    if (ch.ragdoll) flags |= SNAP_FLAGS.ragdoll;
    if (ch.vehicleId) flags |= SNAP_FLAGS.inVehicle;
    write(ch.id, 0, t.x, t.y, t.z, r.x, r.y, r.z, r.w, 0, flags);
  }
  for (const v of vehicles) {
    const t = v.controller.translation();
    const r = v.controller.rotation();
    let flags = 0;
    if (v.controller.authority) flags |= SNAP_FLAGS.authority;
    write(v.id, v.kind, t.x, t.y, t.z, r.x, r.y, r.z, r.w, v.controller.signedSpeed(), flags);
  }
  return { count: n, copy: buf.slice(0, n * SNAP_STRIDE) };
}
