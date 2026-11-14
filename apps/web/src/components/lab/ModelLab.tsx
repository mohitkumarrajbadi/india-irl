"use client";

/**
 * Dev turntable at /lab. Query: ?set=avatars|walk|vehicles|traffic|animals|trees|street|metro
 * &light=studio|day &yaw=0.5 &only=2 &cam=x,y,z &at=x,y,z &emote=1
 */
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { animalSet, metroSet, streetSet, treeSet } from "./prop-sets";
import { avatarSet, trafficSet, vehicleSet, walkSet, type LabSet } from "./sets";

const SETS = ["avatars", "walk", "vehicles", "traffic", "animals", "trees", "street", "metro"] as const;
type SetId = (typeof SETS)[number];

function buildSet(id: SetId, emote: number): LabSet {
  if (id === "walk") return walkSet();
  if (id === "vehicles") return vehicleSet();
  if (id === "traffic") return trafficSet();
  if (id === "animals") return animalSet();
  if (id === "trees") return treeSet();
  if (id === "street") return streetSet();
  if (id === "metro") return metroSet();
  return avatarSet(emote);
}

const vec = (raw: string | null): [number, number, number] | null => {
  const p = raw?.split(",").map(Number);
  return p && p.length === 3 && p.every(Number.isFinite) ? [p[0], p[1], p[2]] : null;
};

function Lineup({ set, yaw, only }: { set: LabSet; yaw: number; only: number }) {
  const items = only >= 0 ? set.items.slice(only, only + 1) : set.items;
  const width = items.reduce((w, it) => w + it.width, 0);
  let x = -width / 2;
  const slots = items.map((it) => {
    x += it.width;
    return { it, x: x - it.width / 2 };
  });
  useFrame((state, dt) => set.tick?.(Math.min(dt, 0.05), state.clock.elapsedTime));
  return (
    <>
      {slots.map(({ it, x: sx }, i) => (
        <group key={i} position-x={sx} rotation-y={yaw}>
          <primitive object={it.obj} />
        </group>
      ))}
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.002, 0]}>
        <planeGeometry args={[width + 30, 40]} />
        <meshStandardMaterial color="#8d9299" roughness={0.9} />
      </mesh>
    </>
  );
}

export default function ModelLab() {
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const id = (SETS as readonly string[]).includes(q.get("set") ?? "") ? (q.get("set") as SetId) : "avatars";
  const day = q.get("light") === "day";
  const yaw = Number(q.get("yaw") ?? (id === "avatars" || id === "walk" ? 0.3 : 0.7));
  const only = Number(q.get("only") ?? -1);
  const set = useMemo(() => buildSet(id, Number(q.get("emote") ?? 0)), [id, q]);
  const span = (only >= 0 ? set.items[only]?.width ?? 2 : set.items.reduce((w, it) => w + it.width, 0)) + 0.6;
  const tall = id === "metro" || id === "trees" ? 5 : id === "avatars" || id === "walk" ? 1 : 1.2;
  const at = vec(q.get("at")) ?? [0, tall, 0];
  const cam = vec(q.get("cam")) ?? [0, tall * 1.25, Math.max(span * 1.05, tall * 3.2)];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#11161d" }}>
      <nav style={{ position: "absolute", zIndex: 2, top: 10, left: 12, display: "flex", gap: 10, font: "13px system-ui" }}>
        {SETS.map((s) => (
          <a key={s} href={`?set=${s}${day ? "&light=day" : ""}`} style={{ color: s === id ? "#ffd27a" : "#cfd6de" }}>
            {s}
          </a>
        ))}
        <a href={`?set=${id}${day ? "" : "&light=day"}`} style={{ color: "#8fd0ff" }}>
          {day ? "studio light" : "day light"}
        </a>
      </nav>
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ fov: 30, position: cam, near: 0.05, far: 400 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = day ? 1.05 : 1.15;
        }}
      >
        <color attach="background" args={[day ? "#b6d2ea" : "#27415f"]} />
        {day ? (
          <>
            <hemisphereLight args={["#cfe6ff", "#8a7a55", 0.95]} />
            <ambientLight intensity={0.12} />
          </>
        ) : (
          <>
            <hemisphereLight args={["#fff8f0", "#4a6a95", 0.8]} />
            <directionalLight position={[-6, 5, -6]} intensity={1.1} color="#cfe2ff" />
          </>
        )}
        <directionalLight
          position={[span * 0.3 + 4, 14, 9]}
          intensity={day ? 2.6 : 2.0}
          color={day ? "#fff3de" : "#ffffff"}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-span}
          shadow-camera-right={span}
          shadow-camera-top={span}
          shadow-camera-bottom={-span}
          shadow-camera-far={80}
          shadow-bias={-0.0005}
          shadow-normalBias={0.03}
        />
        <Lineup set={set} yaw={yaw} only={only} />
        <OrbitControls target={at} makeDefault />
      </Canvas>
    </div>
  );
}
