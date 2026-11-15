/** Shared builder context for CityProps instancing helpers. */
import type * as THREE from "three";
import type { DestVisualBucket } from "@/game/destructible-sim";
import type { CityData } from "@/world/types";

export type PropAdd = (m: THREE.InstancedMesh) => THREE.InstancedMesh;

export type PropBuildCtx = {
  city: CityData;
  add: PropAdd;
  disposables: { dispose(): void }[];
  /** Optional — wire InstancedMesh slots for destructible sim. */
  registerDest?: (b: DestVisualBucket) => void;
};

export const STALL_TINTS = ["#d9483b", "#f2c230", "#2f7fc4", "#3a9a5a"];
export const COW_TINTS = ["#f1ece0", "#c9a77a", "#4a3a30"];
export const DOG_TINTS = ["#c9a77a", "#5a3a28", "#e8ddd0", "#3a2a22"];
export const GOAT_TINTS = ["#e8e0d4", "#8a7a68", "#4a3a30"];
export const BIKE_TINTS = ["#b3261e", "#1d4e89", "#1b1b1b", "#e2a02c", "#f4f4f4", "#2a7a5a", "#6a1b4d", "#7a4fb0"];
