import type * as THREE from "three";
import { damp, dampAngle, clamp } from "@/lib/math";
import { runtime } from "@/game/runtime";
import { SPECS } from "@/vehicles/specs";
import type { PlayerState } from "./types.ts";

export function stepCamera(
  s: PlayerState,
  camera: THREE.Camera,
  sprint: boolean,
  dt: number,
): number {
  const vehicular = s.mode !== "foot";
  const heading = s.mode === "drive" ? s.ds.yaw : s.facing;
  if (vehicular && s.actual > 2 && s.idle > 1.3) {
    const want = s.ds.speed < -0.5 && s.mode === "drive" ? heading + Math.PI : heading;
    s.camYaw = dampAngle(s.camYaw, want, 2.4, dt);
  }
  const spec = vehicular && s.kind > 0 ? SPECS[s.kind as 1 | 2 | 3] : null;
  const wantDist = (spec ? spec.camDist : 5.2) * s.zoom;
  const focusY = spec ? spec.camHeight : 1.35 + s.y * 0.6;
  const cosP = Math.cos(s.camPitch);
  const sinP = Math.sin(s.camPitch);
  const dirX = -Math.sin(s.camYaw) * cosP;
  const dirZ = -Math.cos(s.camYaw) * cosP;
  let dist = wantDist;
  const grid = runtime.grid;
  if (grid) {
    const steps = 10;
    for (let i = 1; i <= steps; i += 1) {
      const d = (wantDist * i) / steps;
      const y = Math.max(0.5, focusY + d * sinP);
      if (grid.blocked(s.x + dirX * d, y, s.z + dirZ * d, 0.35)) {
        dist = Math.max(1.3, d - wantDist / steps - 0.2);
        break;
      }
    }
  }
  camera.position.set(s.x + dirX * dist, Math.max(0.35, focusY + dist * sinP), s.z + dirZ * dist);
  camera.lookAt(s.x, focusY, s.z);
  if (s.shake > 0.02) {
    const sh = s.shake;
    camera.position.x += (Math.random() - 0.5) * sh * 0.42;
    camera.position.y += (Math.random() - 0.5) * sh * 0.28;
    camera.position.z += (Math.random() - 0.5) * sh * 0.42;
    if (s.wastedUntil <= 0) s.shake *= Math.exp(-7 * dt);
  } else s.shake = 0;

  const persp = camera as THREE.PerspectiveCamera;
  const wantFov = 58 + (vehicular ? clamp(s.actual * 0.38, 0, 10) : sprint && s.actual > 5 ? 3 : 0);
  s.fov = damp(s.fov, wantFov, 4, dt);
  if (Math.abs(persp.fov - s.fov) > 0.05) {
    persp.fov = s.fov;
    persp.updateProjectionMatrix();
  }
  return heading;
}
