/** Shared 2D city map types + district colors. */

export const KIND_COLOR: Record<string, string> = {
  tech: "#3d5266",
  cbd: "#355a72",
  resi: "#4f564c",
  market: "#735440",
  old: "#634c3c",
  park: "#3a6b38",
  landmark: "#7e6e48",
  lake: "#2a6a88",
};

export type MapJob = {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  stage: string;
};

export type MapMarkers = {
  player?: { x: number; z: number; yaw: number };
  peers?: { x: number; z: number; veh: boolean }[];
  job?: MapJob | null;
  /** Highlight a meet id (menu spawn / deep-link). */
  meetId?: string | null;
  labels?: boolean;
};

export type CityMapAtlas = {
  canvas: HTMLCanvasElement;
  /** World → atlas pixel. */
  mx: (x: number) => number;
  mz: (z: number) => number;
  /** Atlas pixels per world metre. */
  ppm: number;
  width: number;
  height: number;
  worldW: number;
  worldH: number;
};
