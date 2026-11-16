import { isCombatEmote } from "@/avatar/rig";
import { apartmentClamp, apartmentInside } from "@/game/apartment";
import { approachSpeed, FOOT, integrateKnockback } from "@/game/physics";
import { runtime } from "@/game/runtime";
import { footAuthorityStep, footAuthorityUsesWorldColliders } from "@/game/sim/foot-authority";
import { hangoutLeave, hangoutSeated } from "@/game/social/hangout";
import { dampAngle } from "@/lib/math";
import { KIND_INFO } from "@/vehicles/traffic";
import { sampleTerrain } from "@/world/terrain-sample";
import { PLAYER_RADIUS, resolveOut } from "./constants.ts";
import type { MoveAxes } from "./step-look.ts";
import type { PlayerState } from "./types.ts";

export function stepFoot(s: PlayerState, axes: MoveAxes, now: number, dt: number): void {
  let { forward, strafe, sprint, jump } = axes;
  const stunned = now < s.stunUntil;
  if (hangoutSeated()) {
    if (Math.hypot(forward, strafe) > 0.2) {
      hangoutLeave();
      s.emote = 0;
    } else {
      forward = 0;
      strafe = 0;
      jump = false;
    }
  }
  const usedSimFoot = footAuthorityStep(
    s,
    { forward, strafe, camYaw: s.camYaw, facing: s.facing, sprint, jump, stunned },
    dt,
  );
  const grid = runtime.grid;
  if (!usedSimFoot) {
    const mag = Math.hypot(forward, strafe);
    const moving = mag > 0.04 && !stunned;
    if (moving && s.emote !== 0 && !isCombatEmote(s.emote)) s.emote = 0;
    const pace = Math.min(1, mag);
    const terrain = runtime.city ? sampleTerrain(runtime.city, s.x, s.z, s.y) : null;
    const groundY = terrain?.y ?? 0;
    const grounded = s.y <= groundY + 0.001;
    if (grounded) s.coyote = FOOT.coyote;
    else s.coyote = Math.max(0, s.coyote - dt);
    const surfaceMul =
      terrain && (terrain.surface === "mud" || terrain.surface === "dirt") ? 0.82 : 1;
    const target = moving ? (sprint ? FOOT.sprint : FOOT.walk) * pace * surfaceMul : 0;
    const airMul = grounded ? 1 : FOOT.airControl;
    s.speed = approachSpeed(s.speed, target * airMul, dt, moving && grounded);
    if (moving) {
      const inv = 1 / mag;
      const sin = Math.sin(s.camYaw);
      const cos = Math.cos(s.camYaw);
      s.dir.set(forward * inv * sin - strafe * inv * cos, 0, forward * inv * cos + strafe * inv * sin);
    }
    const px = s.x;
    const pz = s.z;
    const kb = integrateKnockback(s.kb, dt);
    let nx = px + s.dir.x * s.speed * dt + kb.dx;
    let nz = pz + s.dir.z * s.speed * dt + kb.dz;
    if (grid) {
      grid.resolve(nx, nz, PLAYER_RADIUS, resolveOut);
      nx = resolveOut.x;
      nz = resolveOut.z;
    }
    const sim = runtime.traffic;
    if (sim) {
      for (const a of sim.agents) {
        if (a.taken) continue; // wrecked bikes stay as foot obstacles
        const info = KIND_INFO[a.kind];
        const r = (info.len + info.wid) * 0.25 + PLAYER_RADIUS;
        const dx = nx - a.x;
        const dz = nz - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          nx = a.x + (dx / d) * r;
          nz = a.z + (dz / d) * r;
          s.speed *= 0.88;
        }
      }
    }
    if (apartmentInside()) {
      const c = apartmentClamp(nx, nz);
      nx = c.x;
      nz = c.z;
    }
    s.x = nx;
    s.z = nz;
    s.actual = dt > 0 ? Math.hypot(s.x - px, s.z - pz) / dt : 0;
    if (jump && !stunned && (grounded || s.coyote > 0) && s.vy <= 0.05) {
      s.vy = FOOT.jump;
      s.coyote = 0;
    }
    if (s.vy !== 0 || s.y > groundY + 0.001) {
      s.vy -= FOOT.gravity * dt;
      const prevY = s.y;
      s.y = Math.max(groundY, s.y + s.vy * dt);
      if (s.y <= groundY + 1e-4) {
        if (prevY > groundY + 0.15 && s.vy < -4) s.speed *= 0.72;
        s.y = groundY;
        s.vy = 0;
      }
    } else {
      s.y = groundY;
    }
    if (s.actual > 0.2 && !stunned) s.facing = dampAngle(s.facing, Math.atan2(s.dir.x, s.dir.z), 12, dt);
  } else if (s.emote !== 0 && !isCombatEmote(s.emote) && Math.hypot(forward, strafe) > 0.04) {
    s.emote = 0;
  }
  if (usedSimFoot && !footAuthorityUsesWorldColliders() && grid) {
    grid.resolve(s.x, s.z, PLAYER_RADIUS, resolveOut);
    s.x = resolveOut.x;
    s.z = resolveOut.z;
  }
  if (apartmentInside()) {
    const c = apartmentClamp(s.x, s.z);
    s.x = c.x;
    s.z = c.z;
  }
}
