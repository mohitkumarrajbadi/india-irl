"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { QuadBatch } from "@/gfx/geo";
import { paverTexture, roadTexture, zebraTexture } from "@/gfx/textures";
import { WALK } from "@/world/generate";
import type { CityData } from "@/world/types";

const TILE = 16;

function build(city: CityData) {
  const { xs, zs, roadsX, roadsZ, blocks, config } = city;
  const { cols, rows } = config;
  const minor = new QuadBatch();
  const art = new QuadBatch();
  const plain = new QuadBatch();
  const zebra = new QuadBatch();
  const paver = new QuadBatch();
  const lot = new QuadBatch();
  const grass = new QuadBatch();
  const Y = 0.02;

  for (let i = 0; i <= cols; i += 1) {
    const line = roadsX[i];
    const batch = line.arterial ? art : minor;
    for (let j = 0; j < rows; j += 1) {
      const z0 = zs[j] + roadsZ[j].half;
      const z1 = zs[j + 1] - roadsZ[j + 1].half;
      batch.quad(line.c - line.half, z0, line.c + line.half, z1, Y, { u0: 0, u1: 1, v0: z0 / TILE, v1: z1 / TILE });
    }
  }
  for (let j = 0; j <= rows; j += 1) {
    const line = roadsZ[j];
    const batch = line.arterial ? art : minor;
    for (let i = 0; i < cols; i += 1) {
      const x0 = xs[i] + roadsX[i].half;
      const x1 = xs[i + 1] - roadsX[i + 1].half;
      batch.quad(x0, line.c - line.half, x1, line.c + line.half, Y, { u0: 0, u1: 1, v0: x0 / TILE, v1: x1 / TILE, swap: true });
    }
  }

  const stripes = (x0: number, z0: number, x1: number, z1: number, alongX: boolean) => {
    const span = alongX ? x1 - x0 : z1 - z0;
    zebra.quad(x0, z0, x1, z1, Y + 0.006, { u0: 0, u1: span / 16, v0: 0, v1: 1, swap: !alongX });
  };
  for (let i = 0; i <= cols; i += 1) {
    for (let j = 0; j <= rows; j += 1) {
      const hx = roadsX[i].half;
      const hz = roadsZ[j].half;
      const cx = xs[i];
      const cz = zs[j];
      plain.quad(cx - hx, cz - hz, cx + hx, cz + hz, Y, { u0: (cx - hx) / 8, u1: (cx + hx) / 8, v0: (cz - hz) / 8, v1: (cz + hz) / 8 });

      const crossX = (z0: number, z1: number) => {
        // Crossing a vertical road: stripes run across X. Split around an arterial median.
        const m = roadsX[i].median + 0.15;
        if (roadsX[i].arterial) {
          stripes(cx - hx + 0.5, z0, cx - m, z1, true);
          stripes(cx + m, z0, cx + hx - 0.5, z1, true);
        } else stripes(cx - hx + 0.5, z0, cx + hx - 0.5, z1, true);
      };
      const crossZ = (x0: number, x1: number) => {
        const m = roadsZ[j].median + 0.15;
        if (roadsZ[j].arterial) {
          stripes(x0, cz - hz + 0.5, x1, cz - m, false);
          stripes(x0, cz + m, x1, cz + hz - 0.5, false);
        } else stripes(x0, cz - hz + 0.5, x1, cz + hz - 0.5, false);
      };
      if (j < rows) crossX(cz + hz + 0.8, cz + hz + 3.8);
      if (j > 0) crossX(cz - hz - 3.8, cz - hz - 0.8);
      if (i < cols) crossZ(cx + hx + 0.8, cx + hx + 3.8);
      if (i > 0) crossZ(cx - hx - 3.8, cx - hx - 0.8);
    }
  }

  const SY = 0.055;
  const ring = new THREE.Color(config.palette.paver);
  const dirt = new THREE.Color(config.palette.paver).multiplyScalar(0.8);
  const plaza = new THREE.Color(config.palette.paver).multiplyScalar(1.08);
  const green = new THREE.Color("#5d8a3e");
  for (const b of blocks) {
    const q = (x0: number, z0: number, x1: number, z1: number, batch: QuadBatch, color: THREE.Color) =>
      batch.quad(x0, z0, x1, z1, SY, { u0: x0 / 4, u1: x1 / 4, v0: z0 / 4, v1: z1 / 4 }, color);
    const { minX, maxX, minZ, maxZ } = b;
    q(minX, minZ, maxX, minZ + WALK, paver, ring);
    q(minX, maxZ - WALK, maxX, maxZ, paver, ring);
    q(minX, minZ + WALK, minX + WALK, maxZ - WALK, paver, ring);
    q(maxX - WALK, minZ + WALK, maxX, maxZ - WALK, paver, ring);
    if (b.kind === "lake") continue;
    const inner = [minX + WALK, minZ + WALK, maxX - WALK, maxZ - WALK] as const;
    if (b.kind === "park") q(...inner, grass, green);
    else if (b.kind === "landmark") q(...inner, paver, plaza);
    else q(...inner, lot, dirt);
  }

  return {
    minor: minor.build(),
    art: art.build(),
    plain: plain.build(),
    zebra: zebra.build(),
    paver: paver.build(),
    lot: lot.build(),
    grass: grass.build(),
  };
}

export function CityGround({ city }: { city: CityData }) {
  const stuff = useMemo(() => {
    const geos = build(city);
    const roadMinor = roadTexture("minor");
    const roadArt = roadTexture("arterial");
    const roadPlain = roadTexture("plain");
    const zebraTex = zebraTexture();
    const paverTex = paverTexture("#ffffff");
    const std = (map: THREE.Texture | null, vertexColors: boolean, rough = 0.93) =>
      new THREE.MeshStandardMaterial({ map, vertexColors, roughness: rough, metalness: 0 });
    const zebraMat = new THREE.MeshStandardMaterial({
      map: zebraTex,
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    return {
      geos,
      textures: [roadMinor, roadArt, roadPlain, zebraTex, paverTex],
      mats: {
        minor: std(roadMinor, false),
        art: std(roadArt, false),
        plain: std(roadPlain, false),
        paver: std(paverTex, true),
        lot: std(paverTex, true, 1),
        grass: std(null, true, 1),
        zebra: zebraMat,
        base: new THREE.MeshStandardMaterial({ color: city.config.palette.ground, roughness: 1 }),
      },
    };
  }, [city]);

  useEffect(
    () => () => {
      Object.values(stuff.geos).forEach((g) => g.dispose());
      stuff.textures.forEach((t) => t.dispose());
      Object.values(stuff.mats).forEach((m) => m.dispose());
    },
    [stuff],
  );

  const { geos, mats } = stuff;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]} material={mats.base} receiveShadow>
        <planeGeometry args={[3600, 3600]} />
      </mesh>
      <mesh geometry={geos.paver} material={mats.paver} receiveShadow />
      <mesh geometry={geos.lot} material={mats.lot} receiveShadow />
      <mesh geometry={geos.grass} material={mats.grass} receiveShadow />
      <mesh geometry={geos.minor} material={mats.minor} receiveShadow />
      <mesh geometry={geos.art} material={mats.art} receiveShadow />
      <mesh geometry={geos.plain} material={mats.plain} receiveShadow />
      <mesh geometry={geos.zebra} material={mats.zebra} receiveShadow />
    </group>
  );
}
