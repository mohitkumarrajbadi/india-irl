"use client";

/** Avatar stage: studio lights + drag-to-spin preview. */
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { lookKey, type Look } from "@/avatar/appearance";
import { buildRig, poseRig } from "@/avatar/rig";
import { CITY_UI } from "@/world/cityUi";
import type { CityId } from "@/world/types";

function Preview({ look, emote }: { look: Look; emote: number }) {
  const key = lookKey(look);
  const rig = useMemo(() => buildRig(look), [key, look]);
  const group = useRef<THREE.Group>(null);
  const drag = useRef({ down: false, x: 0, vel: 0 });
  const started = useRef(performance.now());

  useEffect(() => {
    started.current = performance.now();
    if (group.current) group.current.rotation.y = 0.32;
    drag.current.vel = 0;
  }, [emote, key]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (!drag.current.down && Math.abs(drag.current.vel) > 0.002) {
      g.rotation.y += drag.current.vel * delta;
      drag.current.vel *= Math.exp(-delta * 2.4);
    } else if (!drag.current.down) {
      const target = 0.32;
      let d = target - g.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      g.rotation.y += d * Math.min(1, delta * 1.8);
      drag.current.vel = 0;
    }
    poseRig(
      rig,
      {
        phase: 0,
        speed: 0,
        emote,
        emoteT: (performance.now() - started.current) / 1000,
        seat: 0,
        time: state.clock.elapsedTime,
      },
      delta,
    );
  });

  return (
    <group
      ref={group}
      onPointerDown={(e) => {
        drag.current.down = true;
        drag.current.x = e.clientX;
        (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current.down || !group.current) return;
        const dx = e.clientX - drag.current.x;
        drag.current.x = e.clientX;
        group.current.rotation.y += dx * 0.012;
        drag.current.vel = dx * 0.4;
      }}
      onPointerUp={() => {
        drag.current.down = false;
      }}
    >
      <primitive key={key} object={rig.root} />
      <mesh position={[0, 0.5, 0]} visible={false}>
        <boxGeometry args={[1.4, 2.2, 1.4]} />
      </mesh>
    </group>
  );
}

function StageGlow({ pulse }: { pulse: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    const m = mesh.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.22 + Math.sin(performance.now() * 0.003 + pulse) * 0.06;
    mesh.current.rotation.z += dt * 0.15;
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
      <ringGeometry args={[1.05, 1.32, 64]} />
      <meshBasicMaterial color="#e7c56a" transparent opacity={0.28} />
    </mesh>
  );
}

export function PreviewCanvas({
  look,
  emote,
  pulse,
  cityId,
}: {
  look: Look;
  emote: number;
  pulse: number;
  cityId: CityId;
}) {
  const ui = CITY_UI[cityId];
  const floor = useMemo(() => {
    const c = new THREE.Color(ui.accent);
    c.multiplyScalar(0.18);
    return `#${c.getHexString()}`;
  }, [ui.accent]);
  return (
    <Canvas
      key={`preview-${cityId}`}
      dpr={1}
      frameloop="always"
      flat
      camera={{ fov: 28, position: [0, 1.15, 3.35], near: 0.1, far: 30 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ camera, gl, scene }) => {
        camera.lookAt(0, 1.05, 0);
        const sky = "#1c2838";
        gl.setClearColor(sky, 1);
        scene.background = new THREE.Color(sky);
        scene.fog = new THREE.FogExp2(sky, 0.045);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
        gl.domElement.style.background = sky;
      }}
      style={{ background: "#1c2838" }}
      shadows
    >
      <hemisphereLight args={["#ffe8d0", "#1a3048", 0.85]} />
      <directionalLight
        position={[2.4, 5.2, 2.8]}
        intensity={2.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3.2, 2.0, -1.8]} intensity={0.55} color="#8eb4ff" />
      <directionalLight position={[0.2, 1.4, 3.5]} intensity={0.35} color="#ffc98a" />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.005, 0]} receiveShadow>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial color={floor} roughness={0.85} metalness={0.12} />
      </mesh>
      {/* Soft skyline silhouettes — suggests a living city behind the avatar. */}
      <group position={[0, 0, -4.2]} rotation-y={0.08}>
        {[
          [-2.2, 1.1, 0.7],
          [-1.1, 1.8, 0.9],
          [0.1, 1.4, 0.75],
          [1.2, 2.1, 0.85],
          [2.4, 1.2, 0.65],
        ].map(([x, h, w], i) => (
          <mesh key={i} position={[x, h / 2, 0]}>
            <boxGeometry args={[w, h, 0.4]} />
            <meshStandardMaterial color="#243044" roughness={0.95} metalness={0.05} />
          </mesh>
        ))}
      </group>
      <StageGlow pulse={pulse} />
      <Preview look={look} emote={emote} />
    </Canvas>
  );
}
