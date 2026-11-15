/** Drive authority + wall/traffic/ped collisions. */
import { crashCue } from "@/game/audio";
import { breakCue } from "@/game/destructible-audio";
import { massWallSeverity, reportCrash, wallCrashSeverity } from "@/game/crash";
import { softSpeedScrub } from "@/game/crash-feel";
import { collidePlayerTraffic } from "@/game/drive-collide";
import { runtime } from "@/game/runtime";
import {
  driveAuthorityStep,
  driveAuthorityUsesWorldColliders,
} from "@/game/sim/drive-authority";
import { takeDriveImpact } from "@/game/sim/drive-impact";
import { toast } from "@/game/store";
import { clamp } from "@/lib/math";
import { PLAYER_MASS } from "@/vehicles/mass";
import { PLAYER_PHYSICS } from "@/vehicles/physics-props";
import { SPECS, stepDrive } from "@/vehicles/specs";
import { wetGripMul } from "@/game/weather";
import { driveGrade } from "@/world/terrain-drive";
import { sampleTerrain } from "@/world/terrain-sample";
import type { CityData } from "@/world/types";
import { tickBlinkerCancel } from "./blinker-cancel.ts";
import { resolveOut } from "./constants.ts";
import type { MoveAxes } from "./step-look.ts";
import type { PlayerCmds, PlayerState } from "./types.ts";

export function stepDriveMode(
  s: PlayerState,
  cmds: PlayerCmds,
  city: CityData,
  axes: MoveAxes,
  now: number,
  dt: number,
): void {
  const spec = SPECS[s.kind as 1 | 2 | 3];
  const { forward, strafe, sprint, jump } = axes;
  const usedRapier = driveAuthorityStep(s.ds, s.kind, {
    forward,
    strafe,
    yaw: s.ds.yaw,
    sprint,
    jump,
    speed: s.ds.speed,
  });
  if (!usedRapier) {
    const phys = PLAYER_PHYSICS[s.kind as 1 | 2 | 3];
    const terrain = sampleTerrain(city, s.ds.x, s.ds.z);
    stepDrive(
      s.ds,
      {
        throttle: clamp(forward, -1, 1),
        steer: clamp(strafe, -1, 1),
        boost: sprint,
        handbrake: jump,
        health: s.chassisHp / Math.max(1, phys.durability),
        gripMul: terrain.grip * wetGripMul(),
        grade: driveGrade(terrain, s.ds.yaw),
      },
      spec,
      dt,
    );
    // Match chassis to apron height outside the flat city fabric
    if (terrain.y > 0.05) s.y = terrain.y;
    else if (s.mode === "drive") s.y = 0;
  }
  const rapierHit = usedRapier ? takeDriveImpact() : null;
  if (rapierHit && now > s.crashCd) {
    const raw = wallCrashSeverity(0.4 + Math.min(2, Math.abs(rapierHit.speed) * 0.08), rapierHit.speed);
    const sev = massWallSeverity(raw, PLAYER_MASS[s.kind as 1 | 2 | 3]);
    if (sev > 0.35) {
      s.crashCd = now + 850;
      cmds.applyCrashHit(sev, rapierHit.fx || Math.sin(s.ds.yaw), rapierHit.fz || Math.cos(s.ds.yaw), rapierHit.speed);
    }
  }
  for (const e of city.extras) {
    if (e.v !== 7) continue;
    const dx = s.ds.x - e.x;
    const dz = s.ds.z - e.z;
    if (dx * dx + dz * dz < 2.8 * 2.8) {
      s.ds.speed *= Math.exp(-2.8 * dt);
      break;
    }
  }
  const grid = runtime.grid;
  if (grid && !(usedRapier && driveAuthorityUsesWorldColliders())) {
    const bx = s.ds.x;
    const bz = s.ds.z;
    const spd0 = s.ds.speed;
    grid.resolve(bx, bz, spec.radius, resolveOut);
    const pushed = Math.hypot(resolveOut.x - bx, resolveOut.z - bz);
    if (pushed > 1e-4) {
      const nx = resolveOut.x - bx;
      const nz = resolveOut.z - bz;
      s.ds.x = resolveOut.x;
      s.ds.z = resolveOut.z;
      const sev = massWallSeverity(wallCrashSeverity(pushed, spd0), PLAYER_MASS[s.kind as 1 | 2 | 3]);
      if (sev > 0.35 && now > s.crashCd) {
        s.crashCd = now + 850;
        cmds.applyCrashHit(sev, nx || Math.sin(s.ds.yaw), nz || Math.cos(s.ds.yaw), spd0);
      } else {
        s.ds.speed *= 1 - clamp(pushed * 6 + Math.abs(spd0) * 0.04, 0, 0.78);
      }
    }
  }
  const sim = runtime.traffic;
  if (sim && s.mode === "drive") {
    const hit = collidePlayerTraffic(
      s.ds.x,
      s.ds.z,
      s.ds.yaw,
      s.ds.speed,
      s.kind as 1 | 2 | 3,
      spec,
      sim.agents,
      resolveOut,
    );
    s.ds.x = resolveOut.x;
    s.ds.z = resolveOut.z;
    if (hit) {
      if (hit.flungBike && now - s.lastCrashToast > 900) {
        s.lastCrashToast = now;
        toast("Scooter sent flying");
      }
      if (hit.sev > 0.38 && now > s.crashCd) {
        s.crashCd = now + 800;
        const ejected = cmds.applyCrashHit(hit.sev, hit.nx, hit.nz, hit.speedBefore, {
          otherMass: hit.otherMass,
          closing: hit.closing,
          speedAfter: hit.speedAfter,
          yawKick: hit.yawKick,
        });
        if (!ejected && hit.zone === "side" && now - s.lastCrashToast > 1100) {
          s.lastCrashToast = now;
          toast("Side impact");
        }
      } else if (hit.sev > 0.05) {
        s.ds.speed = softSpeedScrub(hit.speedAfter, hit.sev * 0.5);
        s.ds.yaw += hit.yawKick * 0.45;
        s.shake = Math.min(0.7, s.shake + hit.sev * 0.25);
      }
    }
  }
  const dest = runtime.destructibles;
  if (dest && s.mode === "drive" && Math.abs(s.ds.speed) > 2.8) {
    const smash = dest.hit(
      s.ds.x,
      s.ds.z,
      s.ds.yaw,
      s.ds.speed,
      spec.length * 0.5,
      spec.width * 0.5,
      PLAYER_MASS[s.kind as 1 | 2 | 3],
      now,
    );
    if (smash) {
      s.ds.speed *= 1 - Math.min(0.45, 0.12 + smash.severity * 0.28);
      s.shake = Math.min(1.1, s.shake + 0.15 + smash.severity * 0.4);
      breakCue(smash.material, smash.severity);
      crashCue(0.35 + smash.severity * 0.5);
      if (now - s.lastCrashToast > 900) {
        s.lastCrashToast = now;
        toast(`${smash.label} smashed`);
      }
    }
  }
  const pedSim = runtime.peds;
  if (pedSim && s.mode === "drive" && Math.abs(s.ds.speed) > 2.5 && now > s.pedCrushCd) {
    const crush = pedSim.hitByVehicle(
      { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw, halfL: spec.length * 0.48, halfW: spec.width * 0.48 },
      s.ds.speed,
      now,
      PLAYER_MASS[s.kind as 1 | 2 | 3],
    );
    if (crush.severity > 0) {
      s.pedCrushCd = now + 350;
      s.ds.speed *= crush.kind === "runover" ? 0.82 : crush.kind === "thrown" ? 0.9 : 0.96;
      if (crush.severity > 0.28) {
        s.shake = Math.min(1.2, s.shake + 0.2 + crush.severity * 0.55);
        crashCue(0.45 + crush.severity);
        reportCrash(s.ds.x, s.ds.z, crush.severity * 0.5, false);
        if (now - s.lastCrashToast > 1400) {
          s.lastCrashToast = now;
          toast(
            crush.kind === "runover" ? "Ran them over" : crush.kind === "thrown" ? "Thrown clear" : "Brushed a pedestrian",
          );
        }
      }
    }
  }
  if (s.mode === "drive") {
    s.x = s.ds.x;
    s.z = s.ds.z;
    s.actual = Math.abs(s.ds.speed);
    tickBlinkerCancel(s);
  }
}
