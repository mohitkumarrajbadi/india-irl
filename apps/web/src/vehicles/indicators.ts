/** Turn-indicator meshes for player vehicles (flash via emissive). */
import * as THREE from "three";

export type BlinkerSide = -1 | 0 | 1; // left | off | right

const AMBER = "#ffb000";

function lamp(x: number, y: number, z: number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: AMBER,
    emissive: AMBER,
    emissiveIntensity: 0.15,
    toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), mat);
  m.position.set(x, y, z);
  return m;
}

/** Attach FL/FR/RL/RR lamps; returns meshes for blink updates. */
export function attachIndicators(tilt: THREE.Group, kind: 1 | 2 | 3): THREE.Mesh[] {
  const lamps: THREE.Mesh[] = [];
  if (kind === 2) {
    // Scooter — front apron corners + rear
    lamps.push(lamp(0.16, 0.72, 0.58), lamp(-0.16, 0.72, 0.58));
    lamps.push(lamp(0.12, 0.7, -0.95), lamp(-0.12, 0.7, -0.95));
  } else if (kind === 1) {
    lamps.push(lamp(0.55, 0.85, 1.15), lamp(-0.55, 0.85, 1.15));
    lamps.push(lamp(0.55, 0.85, -1.05), lamp(-0.55, 0.85, -1.05));
  } else {
    lamps.push(lamp(0.78, 0.78, 1.95), lamp(-0.78, 0.78, 1.95));
    lamps.push(lamp(0.78, 0.8, -1.95), lamp(-0.78, 0.8, -1.95));
  }
  for (const m of lamps) tilt.add(m);
  return lamps;
}

/** Flash left (0,2) or right (1,3) pair; hazards = both. */
export function setIndicatorFlash(lamps: THREE.Mesh[], side: BlinkerSide, on: boolean): void {
  const hi = on ? 3.2 : 0.12;
  const lo = 0.12;
  for (let i = 0; i < lamps.length; i += 1) {
    const mat = lamps[i].material as THREE.MeshStandardMaterial;
    // Specs: +X is left of vehicle; we add +X then −X per axle.
    const isLeft = i % 2 === 0;
    const isRight = i % 2 === 1;
    let lit = false;
    if (side === -1 && isLeft) lit = on;
    else if (side === 1 && isRight) lit = on;
    else if (side === 0) lit = false;
    mat.emissiveIntensity = lit ? hi : lo;
  }
}
