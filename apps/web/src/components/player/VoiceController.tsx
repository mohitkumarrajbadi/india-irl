"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { live } from "@/game/runtime";
import { hangoutSeated, hangoutVoiceDist2 } from "@/game/social/hangout";
import { isSocialV2Enabled } from "@/game/sim/flags";
import { voice } from "@/net/voice";
import { useNet } from "@/net/store";
import { PositionalVoice } from "./PositionalVoice";

/**
 * Drives proximity voice from peer render positions.
 * Mounted inside the Canvas so it shares the frame loop without React re-renders.
 */
export function VoiceController() {
  const acc = useRef(0);
  const social = typeof window !== "undefined" && isSocialV2Enabled();

  useEffect(() => () => voice.disable(), []);

  useFrame((_, delta) => {
    if (!voice.on) return;
    acc.current += delta;
    if (acc.current < 0.12) return;
    acc.current = 0;
    const { peerMap } = useNet.getState();
    const selfSit = !!hangoutSeated();
    const nearby: { id: string; x: number; z: number; dist2?: number }[] = [];
    peerMap.forEach((p) => {
      if (p.snaps.length === 0) return;
      const x = p.rx || p.snaps[p.snaps.length - 1].x;
      const z = p.rz || p.snaps[p.snaps.length - 1].z;
      const peerSit = p.emote === 4;
      nearby.push({
        id: p.id,
        x,
        z,
        dist2: social ? hangoutVoiceDist2(live.x, live.z, x, z, selfSit && peerSit) : undefined,
      });
    });
    voice.tick(nearby);
  });

  return social ? <PositionalVoice /> : null;
}
