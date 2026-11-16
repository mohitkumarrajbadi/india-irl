"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Actor, type ActorFrame } from "@/avatar/actor";
import { quality } from "@/game/quality";
import { clamp, wrapAngle } from "@/lib/math";
import { lodTier } from "@/net/interest";
import { samplePeer } from "@/net/interp";
import { useNet } from "@/net/store";
import type { CityConfig } from "@/world/types";

const frame: ActorFrame = {
  x: 0, z: 0, yaw: 0, speed: 0, vehicle: 0, seat: 0, emote: 0, emoteT: 0, passenger: false, roll: 0, y: 0,
};

/** Reconciles the peer list with a pool of Actors and animates them from interpolated snapshots. */
export function RemotePlayers({ config }: { config: CityConfig }) {
  const { scene, camera } = useThree();
  const ids = useNet((s) => s.peerIds);
  const actors = useRef(new Map<string, { actor: Actor; bubble: number }>());
  const root = useRef(new THREE.Group());

  useEffect(() => {
    const group = root.current;
    scene.add(group);
    const pool = actors.current;
    return () => {
      scene.remove(group);
      pool.forEach((a) => a.actor.dispose());
      pool.clear();
    };
  }, [scene]);

  useEffect(() => {
    const pool = actors.current;
    const { peerMap } = useNet.getState();
    for (const id of ids) {
      const peer = peerMap.get(id);
      if (!peer || pool.has(id)) continue;
      const actor = new Actor(peer.look, peer.name, config);
      actor.group.visible = false;
      root.current.add(actor.group);
      pool.set(id, { actor, bubble: 0 });
    }
    pool.forEach((entry, id) => {
      if (!peerMap.has(id)) {
        entry.actor.dispose();
        pool.delete(id);
      }
    });
  }, [ids, config]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const { peerMap } = useNet.getState();
    const camX = camera.position.x;
    const camZ = camera.position.z;
    const cull = quality.active.avatarCull;

    actors.current.forEach((entry, id) => {
      const p = peerMap.get(id);
      // Wait for ≥2 snaps so Hermite/linear has a segment — avoids origin/default pop.
      if (!p || p.snaps.length < 2) {
        entry.actor.group.visible = false;
        return;
      }

      // Cheap distance before interpolation work.
      const last = p.snaps[p.snaps.length - 1]!;
      const rough2 = (last.x - camX) ** 2 + (last.z - camZ) ** 2;
      const tier = lodTier(rough2, cull);
      if (tier === "culled") {
        entry.actor.group.visible = false;
        return;
      }

      samplePeer(p, now);

      const lod = tier === "near" ? 0 : tier === "mid" ? 1 : 2;
      if (lod === 0) {
        const yawRate = dt > 0 ? wrapAngle(p.ryaw - p.prevYaw) / dt : 0;
        p.prevYaw = p.ryaw;
        const targetRoll = clamp(-yawRate * 0.1, -0.5, 0.5) * (p.veh === 2 ? 1 : 0.12);
        p.roll += (targetRoll - p.roll) * Math.min(1, dt * 6);
      } else {
        p.prevYaw = p.ryaw;
        p.roll *= 0.9;
      }

      frame.x = p.rx;
      frame.z = p.rz;
      frame.yaw = p.ryaw;
      frame.speed = Math.abs(p.rspeed);
      frame.vehicle = p.veh;
      frame.seat = p.seat;
      frame.passenger = p.passenger;
      frame.emote = p.emote;
      frame.emoteT = (now - p.emoteStart) / 1000;
      frame.roll = p.roll;
      frame.y = 0;
      entry.actor.update(frame, dt, now, camX, camZ, lod);

      if (lod < 2 && p.chat && p.chatVersion !== entry.bubble) {
        entry.bubble = p.chatVersion;
        entry.actor.say(p.chat.text, p.chat.until);
      }
    });
  });

  return null;
}
