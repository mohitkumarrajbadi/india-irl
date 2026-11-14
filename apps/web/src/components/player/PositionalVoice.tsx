"use client";

/**
 * Phase E: THREE.PositionalAudio sinks for proximity voice.
 * Mount inside Canvas when socialV2 is on.
 */
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { isSocialV2Enabled } from "@/game/sim/flags";
import { voice } from "@/net/voice";

type Sink = {
  audio: THREE.PositionalAudio;
  lastStream: MediaStream | null;
};

export function PositionalVoice() {
  const { camera, scene } = useThree();
  const listener = useRef<THREE.AudioListener | null>(null);
  const sinks = useRef(new Map<string, Sink>());
  const on = typeof window !== "undefined" && isSocialV2Enabled();

  useEffect(() => {
    if (!on) return;
    const li = new THREE.AudioListener();
    camera.add(li);
    listener.current = li;

    voice.setPositionalSink({
      onGain: (peerId, x, z, gain, stream) => {
        const liNow = listener.current;
        if (!liNow) return;
        let s = sinks.current.get(peerId);
        if (!s) {
          const audio = new THREE.PositionalAudio(liNow);
          audio.setRefDistance(4);
          audio.setRolloffFactor(1.2);
          audio.setVolume(0);
          scene.add(audio);
          s = { audio, lastStream: null };
          sinks.current.set(peerId, s);
        }
        s.audio.position.set(x, 1.5, z);
        s.audio.setVolume(gain);
        if (stream && stream !== s.lastStream) {
          try {
            s.audio.setMediaStreamSource(stream);
            s.lastStream = stream;
          } catch {
            /* stream not ready */
          }
        }
      },
      onDrop: (peerId) => {
        const s = sinks.current.get(peerId);
        if (!s) return;
        s.audio.disconnect();
        scene.remove(s.audio);
        sinks.current.delete(peerId);
      },
    });

    return () => {
      voice.setPositionalSink(null);
      sinks.current.forEach((s) => {
        s.audio.disconnect();
        scene.remove(s.audio);
      });
      sinks.current.clear();
      camera.remove(li);
      listener.current = null;
    };
  }, [on, camera, scene]);

  return null;
}
