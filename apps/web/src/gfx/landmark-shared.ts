import type * as THREE from "three";

/** A box that should get the lit-window building shader. Coordinates are local, unscaled. */
export type LandmarkBox = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: number;
  style: 0 | 1 | 2;
};

export type LandmarkModel = {
  boxes: LandmarkBox[];
  details: THREE.BufferGeometry;
};

export const STONE = "#b9ab9a";
export const STONE_D = "#8d8070";
export const GOLD = "#d6a93a";
export const DARK = "#2b2d33";
export const CHROME = "#b0b6bc";

const hex = (s: string) => parseInt(s.slice(1), 16);

export function box(
  boxes: LandmarkBox[],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  style: 0 | 1 | 2 = 0,
): void {
  boxes.push({ x, y, z, w, h, d, color: hex(color), style });
}
