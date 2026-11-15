"use client";

/** Animated lamp bulbs on traffic-signal extras (red / amber / green phases). */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { signalLampPhaseAt } from "@/world/signals";
import type { CityData } from "@/world/types";

const COL = { red: "#ff2a2a", amber: "#ffb020", green: "#2ee66a" } as const;

export function SignalLights({ city }: { city: CityData }) {
  const signals = useMemo(() => city.extras.filter((e) => e.v === 6), [city]);
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () =>
      signals.map(() => ({
        red: new THREE.MeshStandardMaterial({ color: COL.red, emissive: COL.red, emissiveIntensity: 0.2, toneMapped: false }),
        amber: new THREE.MeshStandardMaterial({ color: COL.amber, emissive: COL.amber, emissiveIntensity: 0.15, toneMapped: false }),
        green: new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: 0.15, toneMapped: false }),
      })),
    [signals],
  );

  useFrame(() => {
    const t = performance.now() * 0.001;
    for (let i = 0; i < mats.length; i += 1) {
      const s = signals[i];
      const phase = signalLampPhaseAt(s.x, s.z, s.rot, city.xs, city.zs, t);
      mats[i].red.emissiveIntensity = phase === "red" ? 2.4 : 0.12;
      mats[i].amber.emissiveIntensity = phase === "amber" ? 2.2 : 0.1;
      mats[i].green.emissiveIntensity = phase === "green" ? 2.4 : 0.1;
    }
  });

  if (signals.length === 0) return null;

  return (
    <group ref={group} name="signal-lights">
      {signals.map((s, i) => {
        const m = mats[i];
        // Mesh yaw = s.rot; trafficSignal head sits at local +Z ≈ 2.2
        const fx = Math.sin(s.rot);
        const fz = Math.cos(s.rot);
        const hx = s.x + fx * 2.2 * s.s;
        const hz = s.z + fz * 2.2 * s.s;
        return (
          <group key={i} position={[hx, 0, hz]}>
            <mesh position={[0, 5.48, 0]} material={m.red}>
              <sphereGeometry args={[0.14, 10, 8]} />
            </mesh>
            <mesh position={[0, 5.2, 0]} material={m.amber}>
              <sphereGeometry args={[0.14, 10, 8]} />
            </mesh>
            <mesh position={[0, 4.92, 0]} material={m.green}>
              <sphereGeometry args={[0.14, 10, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
