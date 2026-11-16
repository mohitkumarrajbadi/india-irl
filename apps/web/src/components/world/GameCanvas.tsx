"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Hud } from "@/components/hud/Hud";
import { applyTimeQuery } from "@/gfx/env";
import { useGame } from "@/game/store";
import { Scene } from "./Scene";
import { useGameCity } from "./useGameCity";
import { useGameSession } from "./useGameSession";
import { usePointerLock } from "./usePointerLock";

export default function GameCanvas() {
  const stage = useRef<HTMLDivElement>(null);
  const name = useGame((s) => s.name);
  const look = useGame((s) => s.look);
  const { city, q, canvasKey } = useGameCity();

  useGameSession(city, name, look);
  usePointerLock(stage);
  useEffect(() => {
    applyTimeQuery();
  }, []);

  return (
    <div
      className="stage"
      ref={stage}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label={`OMMO, ${city.config.name}. Click the scene, then use WASD to move.`}
    >
      <Canvas
        key={canvasKey}
        dpr={[1, q.dpr]}
        shadows={q.shadows ? "basic" : false}
        performance={{ min: 0.55, max: 1, debounce: 350 }}
        camera={{ fov: 56, near: 0.2, far: q.cameraFar, position: [city.spawn.x, 3, city.spawn.z - 6] }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
      >
        <Scene city={city} name={name} look={look} />
      </Canvas>
      <Hud city={city} />
    </div>
  );
}
