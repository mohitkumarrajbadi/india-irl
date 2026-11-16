"use client";

/** Simple flat interior when the local player is inside an apartment. */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { apartmentSession } from "@/game/apartment";

export function ApartmentInterior() {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const floor = new THREE.MeshStandardMaterial({ color: "#c4b49a", roughness: 0.85 });
    const wall = new THREE.MeshStandardMaterial({ color: "#ebe4d6", roughness: 0.9 });
    const accent = new THREE.MeshStandardMaterial({ color: "#1d4e89", roughness: 0.55 });
    return { floor, wall, accent };
  }, []);

  useFrame(() => {
    const s = apartmentSession();
    const g = group.current;
    if (!g) return;
    if (!s) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(s.apt.x, 0, s.apt.z);
    g.rotation.y = s.apt.yaw;
  });

  const h = 4.2;
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} material={mats.floor}>
        <planeGeometry args={[h * 2, h * 2]} />
      </mesh>
      <mesh position={[0, 1.4, -h]} material={mats.wall}>
        <boxGeometry args={[h * 2, 2.8, 0.12]} />
      </mesh>
      <mesh position={[0, 1.4, h]} material={mats.wall}>
        <boxGeometry args={[h * 2, 2.8, 0.12]} />
      </mesh>
      <mesh position={[-h, 1.4, 0]} material={mats.wall}>
        <boxGeometry args={[0.12, 2.8, h * 2]} />
      </mesh>
      <mesh position={[h, 1.4, 0]} material={mats.wall}>
        <boxGeometry args={[0.12, 2.8, h * 2]} />
      </mesh>
      {/* Window strip */}
      <mesh position={[0, 1.6, -h + 0.08]} material={mats.accent}>
        <boxGeometry args={[2.2, 0.9, 0.08]} />
      </mesh>
      {/* Charpai / low couch proxy */}
      <mesh position={[0, 0.28, 1.2]} material={mats.accent}>
        <boxGeometry args={[2.4, 0.35, 1.1]} />
      </mesh>
    </group>
  );
}
