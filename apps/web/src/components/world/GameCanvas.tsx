"use client";

import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Hud } from "@/components/hud/Hud";
import { useGame } from "@/game/store";
import { Scene } from "./Scene";
import { useGameCity } from "./useGameCity";
import { useGameSession } from "./useGameSession";
import { usePointerLock } from "./usePointerLock";

export default function GameCanvas() {
  const stage = useRef<HTMLDivElement>(null);
  const name = useGame((s) => s.name);
  const look = useGame((s) => s.look);
  const { city, q } = useGameCity();

  useGameSession(city, name, look);
  usePointerLock(stage);

  return (
    <div
      className="stage"
      ref={stage}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label={`India IRL, ${city.config.name}. Click the scene, then use WASD to move.`}
    >
      <Canvas
        key={`q-${q.id}-${q.dpr}-${q.shadows}`}
        dpr={[1, q.dpr]}
        shadows={q.shadows ? "percentage" : false}
        camera={{ fov: 58, near: 0.2, far: q.cameraFar, position: [city.spawn.x, 3, city.spawn.z - 6] }}
        gl={{ antialias: q.antialias, alpha: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Scene city={city} name={name} look={look} />
      </Canvas>
      <Hud city={city} />
    </div>
  );
}
