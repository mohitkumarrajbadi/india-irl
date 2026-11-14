/**
 * Kill-plane + last-valid pose — prevents forever-fall after tunnel clips.
 * Applied in the worker after each Rapier step (see world-loop.ts).
 */
import type RAPIER from "@dimforge/rapier3d-compat";
import { KILL_PLANE_Y } from "./materials.ts";
import type { CharState } from "./character.ts";
import type { VehState } from "./sim-types.ts";

export type ValidPose = {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
};

const lastValid = new Map<number, ValidPose>();

export function clearFailsafes(): void {
  lastValid.clear();
}

export function rememberPose(id: number, body: RAPIER.RigidBody, minY = 0.2): void {
  const t = body.translation();
  if (t.y < minY) return;
  const r = body.rotation();
  lastValid.set(id, { x: t.x, y: t.y, z: t.z, qx: r.x, qy: r.y, qz: r.z, qw: r.w });
}

function restore(body: RAPIER.RigidBody, id: number, fallbackY: number): void {
  const p = lastValid.get(id);
  if (p) {
    body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
    body.setRotation({ x: p.qx, y: p.qy, z: p.qz, w: p.qw }, true);
  } else {
    const t = body.translation();
    body.setTranslation({ x: t.x, y: fallbackY, z: t.z }, true);
  }
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

/** CCD/tunnel failsafe — call after world.step(). */
export function enforceKillPlane(
  chars: Iterable<CharState>,
  vehicles: Iterable<VehState>,
  planeY = KILL_PLANE_Y,
): void {
  for (const ch of chars) {
    if (ch.vehicleId) continue;
    const t = ch.body.translation();
    if (t.y < planeY) restore(ch.body, ch.id, 1.0);
    else rememberPose(ch.id, ch.body, 0.35);
  }
  for (const v of vehicles) {
    const body = v.controller.body;
    const t = body.translation();
    if (t.y < planeY) restore(body, v.id, 0.55);
    else rememberPose(v.id, body, 0.2);
  }
}
