"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { voice } from "@/net/voice";
import { useNet } from "@/net/store";

/**
 * Drives proximity voice from peer render positions.
 * Mounted inside the Canvas so it shares the frame loop without React re-renders.
 */
export function VoiceController() {
  const acc = useRef(0);

  useEffect(() => () => voice.disable(), []);

  useFrame((_, delta) => {
    if (!voice.on) return;
    acc.current += delta;
    if (acc.current < 0.12) return;
    acc.current = 0;
    const { peerMap } = useNet.getState();
    const nearby: { id: string; x: number; z: number }[] = [];
    peerMap.forEach((p) => {
      if (p.snaps.length === 0) return;
      nearby.push({ id: p.id, x: p.rx || p.snaps[p.snaps.length - 1].x, z: p.rz || p.snaps[p.snaps.length - 1].z });
    });
    voice.tick(nearby);
  });

  return null;
}
