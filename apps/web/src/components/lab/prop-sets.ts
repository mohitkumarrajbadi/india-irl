/** Model lab line-ups for street life: animals, trees, roadside furniture. */
import * as THREE from "three";
import { vertexMat } from "@/gfx/geo";
import * as P from "@/gfx/props";
import { shrubGeo, treeCrown, treeTrunk } from "@/gfx/trees";
import type { LabItem, LabSet } from "./sets";

function tinted(geo: THREE.BufferGeometry, tint = "#ffffff", mat: THREE.Material = vertexMat): THREE.Object3D {
  const m = new THREE.InstancedMesh(geo, mat, 1);
  m.setMatrixAt(0, new THREE.Matrix4());
  m.setColorAt(0, new THREE.Color(tint));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const item = (obj: THREE.Object3D, label: string, width: number): LabItem => ({ obj, label, width });

export function animalSet(): LabSet {
  return {
    items: [
      item(tinted(P.cow(), "#f1ece0"), "cow", 2.2),
      item(tinted(P.cow(), "#c9a77a"), "cow tan", 2.2),
      item(tinted(P.cow(), "#4a3a30"), "cow dark", 2.2),
      item(tinted(P.streetDog(), "#c9a77a"), "dog", 1.2),
      item(tinted(P.streetDog(), "#3a2a22"), "dog dark", 1.2),
      item(tinted(P.goat(), "#e8e0d4"), "goat", 1.2),
      item(tinted(P.goat(), "#8a7a68"), "goat brown", 1.2),
    ],
  };
}

export function treeSet(): LabSet {
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#6a4a32", roughness: 0.92 });
  const crownMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.88 });
  const shrubMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const tree = (tint: string, s: number) => {
    const g = new THREE.Group();
    const trunk = tinted(treeTrunk(), "#ffffff", trunkMat);
    const crown = tinted(treeCrown(), tint, crownMat);
    crown.position.y = 4.35;
    crown.scale.set(1.55, 1.35, 1.55);
    g.add(trunk, crown);
    g.scale.setScalar(s);
    return g;
  };
  return {
    items: [
      item(tree("#3f8a3c", 1), "tree", 4),
      item(tree("#5a9a3a", 1.2), "tree", 4.4),
      item(tree("#c9482e", 0.9), "gulmohar", 4),
      item(tinted(shrubGeo(), "#ffffff", shrubMat), "shrub", 1.6),
    ],
  };
}

export function streetSet(): LabSet {
  const lamp = P.lampPost();
  const lampG = new THREE.Group();
  lampG.add(tinted(lamp.post), tinted(lamp.head, "#ffe9b0", new THREE.MeshBasicMaterial({ color: "#ffe9b0" })));
  return {
    items: [
      item(tinted(P.chaiStall(), "#d9483b"), "chai stall", 4.2),
      item(tinted(P.fruitCart()), "fruit cart", 2.4),
      item(tinted(P.flowerCart()), "flower cart", 2.2),
      item(tinted(P.newsStand()), "news stand", 2.2),
      item(tinted(P.roadsideShrine()), "shrine", 1.8),
      item(tinted(P.busStop()), "bus stop", 4.6),
      item(tinted(P.autoStand()), "auto stand", 4.8),
      item(tinted(P.waterTanker()), "tanker", 2.6),
      item(tinted(P.trafficSignal()), "signal", 1.6),
      item(lampG, "lamp", 1.6),
      item(tinted(P.speedBreaker()), "breaker", 4.2),
    ],
  };
}

export function metroSet(): LabSet {
  return {
    items: [
      item(tinted(P.metroCoach("#7a3fa0")), "coach", 5),
      item(tinted(P.metroPillar(8.4)), "pillar", 8),
      item(tinted(P.crane()), "crane", 8),
    ],
  };
}
