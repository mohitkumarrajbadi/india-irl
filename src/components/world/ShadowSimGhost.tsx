"use client";

/**
 * Debug ghost for Phase A Rapier auto. Does not affect arcade gameplay.
 * Mount only when shadow sim is enabled.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildShadowInput } from "@/game/sim/feed-input";
import { SHADOW_AUTO_ID } from "@/game/sim/ids";
import { isShadowSimEnabled } from "@/game/sim/flags";
import { getShadowEntities, startShadowSession, type ShadowSession } from "@/game/sim/shadow-session";
import { live } from "@/game/runtime";

type Props = { enabled?: boolean };

export function ShadowSimGhost({ enabled }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const session = useRef<ShadowSession | null>(null);
  const on = enabled ?? (typeof window !== "undefined" && isShadowSimEnabled());

  useEffect(() => {
    if (!on) return;
    session.current = startShadowSession({
      x: live.x,
      y: live.y,
      z: live.z,
      yaw: live.yaw,
    });
    return () => {
      session.current?.dispose();
      session.current = null;
    };
  }, [on]);

  useFrame(() => {
    const s = session.current;
    if (!s?.bridge.ready) return;
    s.bridge.setInput(buildShadowInput());
    const ent = getShadowEntities().find((e) => e.id === SHADOW_AUTO_ID);
    if (!ent || !mesh.current) return;
    mesh.current.position.set(ent.x, ent.y, ent.z);
    mesh.current.quaternion.set(ent.qx, ent.qy, ent.qz, ent.qw);
  });

  if (!on) return null;

  return (
    <mesh ref={mesh} castShadow>
      <boxGeometry args={[1.3, 0.9, 2.4]} />
      <meshStandardMaterial color="#3ddc97" transparent opacity={0.45} wireframe />
    </mesh>
  );
}
