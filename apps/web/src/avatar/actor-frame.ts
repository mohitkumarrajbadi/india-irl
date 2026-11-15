import { quality } from "../game/quality";
import { SPECS, seatWorld } from "../vehicles/specs";
import type { VehicleObject } from "../vehicles/object";
import { poseRig, SEAT, SEAT_HIP_OFFSET, type Rig } from "./rig";
import type { ActorFrame } from "./actor-types";

const seatPos = { x: 0, y: 0, z: 0 };

export type ActorPoseCtx = {
  group: import("three").Group;
  rig: Rig;
  vehicle: VehicleObject | null;
  tag: import("three").Sprite;
  bubble: import("three").Sprite;
  phase: number;
  time: number;
  shadows: boolean;
  bubbleUntil: number;
  lodSkip: number;
  ensureVehicle: (kind: number) => void;
  setPhase: (n: number) => void;
  setTime: (n: number) => void;
  setShadows: (v: boolean) => void;
  setLodSkip: (n: number) => void;
};

/** Apply one frame of pose / LOD / tag visibility to an Actor. */
export function applyActorFrame(
  ctx: ActorPoseCtx,
  f: ActorFrame,
  dt: number,
  now: number,
  camX: number,
  camZ: number,
  lod = 0,
): void {
  const dx = f.x - camX;
  const dz = f.z - camZ;
  const dist2 = dx * dx + dz * dz;
  const q = quality.active;
  const cull = q.avatarCull;
  if (dist2 > cull * cull) {
    ctx.group.visible = false;
    return;
  }
  ctx.group.visible = true;
  const shadowR = q.avatarShadow;
  const wantShadow = lod === 0 && shadowR > 0 && dist2 < shadowR * shadowR;
  if (wantShadow !== ctx.shadows) {
    ctx.setShadows(wantShadow);
    for (const m of ctx.rig.meshes) m.castShadow = wantShadow && m !== ctx.rig.cup;
  }

  ctx.setTime(ctx.time + dt);
  const driving = f.vehicle > 0 && !f.passenger;
  ctx.ensureVehicle(driving ? f.vehicle : 0);

  const rigRoot = ctx.rig.root;
  let seat: number = SEAT.stand;
  let tagY = ctx.rig.height + 0.32;
  ctx.group.position.set(f.x, 0, f.z);
  ctx.group.rotation.y = 0;

  if (driving && ctx.vehicle) {
    const spec = SPECS[f.vehicle as 1 | 2 | 3];
    ctx.vehicle.root.position.set(0, 0, 0);
    ctx.vehicle.root.rotation.y = f.yaw;
    ctx.vehicle.tilt.rotation.z = lod === 0 ? f.roll : 0;
    const side = f.blinker ?? 0;
    const flash = side !== 0 && Math.floor(now / 350) % 2 === 0;
    ctx.vehicle.setBlinkers(side, flash);
    seatWorld(spec, 0, 0, 0, f.yaw, seatPos);
    rigRoot.position.set(seatPos.x, spec.seats[0].y - SEAT_HIP_OFFSET, seatPos.z);
    rigRoot.rotation.set(0, f.yaw, lod === 0 ? f.roll * 0.8 : 0);
    seat = spec.seats[0].pose;
    tagY = f.vehicle === 3 ? 2.15 : f.vehicle === 1 ? 2.35 : ctx.rig.height + 0.42;
  } else if (f.passenger && f.vehicle > 0) {
    const spec = SPECS[f.vehicle as 1 | 2 | 3];
    const s = spec.seats[Math.min(f.seat, spec.seats.length - 1)];
    rigRoot.position.set(0, s.y - SEAT_HIP_OFFSET, 0);
    rigRoot.rotation.set(0, f.yaw, 0);
    seat = s.pose;
    tagY = f.vehicle === 3 ? 2.15 : f.vehicle === 1 ? 2.35 : ctx.rig.height + 0.42;
  } else {
    rigRoot.position.set(0, f.y, 0);
    rigRoot.rotation.set(0, f.yaw, 0);
    ctx.setPhase(ctx.phase + f.speed * dt * 2.15);
  }

  ctx.setLodSkip(ctx.lodSkip + 1);
  const poseEvery = lod === 0 ? 1 : lod === 1 ? 2 : 3;
  if (ctx.lodSkip % poseEvery === 0) {
    poseRig(
      ctx.rig,
      {
        phase: ctx.phase,
        speed: seat === SEAT.stand ? f.speed : 0,
        emote: lod < 2 ? f.emote : 0,
        emoteT: f.emoteT,
        seat,
        time: ctx.time,
        lean: lod === 0 ? f.roll : 0,
      },
      dt * poseEvery,
    );
  }

  ctx.tag.position.set(0, tagY, 0);
  const tagR = q.nameTag;
  ctx.tag.visible = lod < 2 && dist2 < tagR * tagR;
  if (ctx.bubble.visible) {
    if (now > ctx.bubbleUntil || dist2 > 60 * 60) ctx.bubble.visible = false;
    ctx.bubble.position.set(0, tagY + 0.3, 0);
  }
}
