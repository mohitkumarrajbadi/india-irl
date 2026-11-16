/**
 * Per-frame player simulation pipeline (called from PlayerController useFrame).
 */
import type { Actor, ActorFrame } from "@/avatar/actor";
import { useNet } from "@/net/store";
import type { CityData } from "@/world/types";
import type * as THREE from "three";
import { drainTouchPulses } from "./drain-touch.ts";
import { publishLive, syncHud, tickSocialMissions } from "./publish-and-hud.ts";
import { stepCamera } from "./step-camera.ts";
import { stepCombatIncoming } from "./step-combat-incoming.ts";
import { stepDriveMode } from "./step-drive.ts";
import { stepFoot } from "./step-foot.ts";
import { stepLook } from "./step-look.ts";
import { stepPassenger } from "./step-passenger.ts";
import { stepWasted } from "./step-wasted.ts";
import { syncActorFrame, syncHeadlights, tickPlayerAudio } from "./sync-presentation.ts";
import type { PlayerCmds, PlayerState } from "./types.ts";

export type FrameCtx = {
  s: PlayerState;
  cmds: PlayerCmds;
  city: CityData;
  camera: THREE.Camera;
  actor: Actor;
  frame: ActorFrame;
  lights: THREE.Group | null;
  dt: number;
  now: number;
};

export function runPlayerFrame(ctx: FrameCtx): void {
  const { s, cmds, city, camera, actor, frame, lights, now } = ctx;
  const dt = Math.min(ctx.dt, 0.05);
  const { peerMap } = useNet.getState();

  drainTouchPulses(cmds);
  const axes = stepLook(s, dt);
  stepCombatIncoming(s, cmds, peerMap, now, dt);

  const frozen = stepWasted(s, city, now, dt);
  if (!frozen) {
    if (s.mode === "foot") stepFoot(s, axes, now, dt);
    else if (s.mode === "drive") stepDriveMode(s, cmds, city, axes, now, dt);
    else if (s.mode === "passenger") stepPassenger(s, peerMap, now, dt);
  }

  const heading = stepCamera(s, camera, axes.sprint, dt);
  syncActorFrame(s, frame, actor, heading, now, dt, camera.position.x, camera.position.z);
  syncHeadlights(s, lights);
  tickPlayerAudio(s, city, dt);
  publishLive(s, frame, heading, axes.forward, peerMap.size, dt);
  tickSocialMissions(s, peerMap);
  syncHud(s, city, peerMap, dt);
}
