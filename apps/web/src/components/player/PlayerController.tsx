"use client";

/**
 * Local player orchestrator — thin React shell.
 * Simulation lives in `@/game/player/*` (see ENGINEERING.md LOC limits).
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Actor, type ActorFrame } from "@/avatar/actor";
import type { Look } from "@/avatar/appearance";
import { setEngine } from "@/game/audio";
import { bindPlayerCmds } from "@/game/player/bind-player-cmds";
import { createPlayerState } from "@/game/player/create-player-state";
import { runPlayerFrame } from "@/game/player/run-player-frame";
import type { PlayerCmds } from "@/game/player/types";
import { live } from "@/game/runtime";
import type { CityData } from "@/world/types";
import { usePlayerInput } from "./usePlayerInput";

type Props = { city: CityData; name: string; look: Look };

export function PlayerController({ city, name, look }: Props) {
  const { camera, gl } = useThree();
  const actor = useMemo(() => new Actor(look, name, city.config), [look, name, city.config]);
  const lights = useRef<THREE.Group>(null);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const s = useRef(createPlayerState(city)).current;
  const cmds = useRef<PlayerCmds>(bindPlayerCmds(s, city));
  const frame = useMemo<ActorFrame>(
    () => ({
      x: 0,
      z: 0,
      yaw: 0,
      speed: 0,
      vehicle: 0,
      seat: 0,
      emote: 0,
      emoteT: 0,
      passenger: false,
      roll: 0,
      y: 0,
    }),
    [],
  );

  useEffect(() => {
    cmds.current = bindPlayerCmds(s, city);
  }, [s, city]);

  useEffect(
    () => () => {
      actor.dispose();
      setEngine(0, 0);
    },
    [actor],
  );

  useEffect(() => {
    live.x = s.x;
    live.z = s.z;
    live.yaw = s.facing;
    live.vehicle = 0;
    live.rideWith = null;
    live.emote = 0;
  }, [s]);

  usePlayerInput(s, cmds, gl.domElement);

  useFrame((_, delta) => {
    runPlayerFrame({
      s,
      cmds: cmds.current,
      city,
      camera,
      actor,
      frame,
      lights: lights.current,
      dt: delta,
      now: performance.now(),
    });
  }, -1);

  return (
    <>
      <primitive object={actor.group} />
      <group ref={lights} visible={false}>
        <spotLight
          position={[0.45, 0.35, 1.5]}
          angle={0.48}
          penumbra={0.65}
          distance={48}
          decay={1.35}
          intensity={0}
          color="#fff1c8"
          target={lightTarget}
        />
        <spotLight
          position={[-0.45, 0.35, 1.5]}
          angle={0.48}
          penumbra={0.65}
          distance={48}
          decay={1.35}
          intensity={0}
          color="#fff1c8"
          target={lightTarget}
        />
        <primitive object={lightTarget} position={[0, -1.2, 22]} />
      </group>
    </>
  );
}
