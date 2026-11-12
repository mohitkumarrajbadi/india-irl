"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { buildLandmark, type LandmarkBox } from "@/gfx/landmarks";
import { makeBuildingMaterial } from "@/gfx/materials";
import { nightUniform } from "@/gfx/env";
import { signAtlas } from "@/gfx/textures";
import { LANDMARK_FOOTPRINT } from "@/world/generate";
import type { CityData } from "@/world/types";

type Item = { x: number; y: number; z: number; w: number; h: number; d: number; color: number; style: number; seed: number };

function makeSignMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, transparent: false });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = nightUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aRect;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vMapUv * aRect.zw + aRect.xy;\n#endif");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uNight;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb *= mix(0.78, 1.15, uNight);");
  };
  mat.customProgramCacheKey = () => "india-irl-sign";
  return mat;
}

export function CityBuildings({ city }: { city: CityData }) {
  const set = useMemo(() => {
    // Ordinary buildings plus the boxes that make up each landmark.
    const items: Item[] = city.buildings.map((b) => ({ ...b, y: b.y }));
    const details: THREE.Mesh[] = [];
    for (const lm of city.landmarks) {
      if (lm.spec.kind === "lake") continue;
      const model = buildLandmark(lm.spec.kind);
      const [fw] = LANDMARK_FOOTPRINT[lm.spec.kind];
      const s = lm.w / fw;
      model.boxes.forEach((b: LandmarkBox, k) =>
        items.push({
          x: lm.x + b.x * s,
          y: b.y * s,
          z: lm.z + b.z * s,
          w: b.w * s,
          h: b.h * s,
          d: b.d * s,
          color: b.color,
          style: b.style,
          seed: ((k * 0.137 + lm.x * 0.01) % 1 + 1) % 1,
        }),
      );
      const mesh = new THREE.Mesh(model.details, vertexMat);
      mesh.position.set(lm.x, 0, lm.z);
      mesh.scale.setScalar(s);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      details.push(mesh);
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const styleAttr = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 2), 2);
    items.forEach((b, i) => styleAttr.setXY(i, b.style, b.seed));
    boxGeo.setAttribute("aStyle", styleAttr);
    const buildingMat = makeBuildingMaterial();
    const buildings = makeInstanced(
      boxGeo,
      buildingMat,
      items.length,
      (i, o) => {
        const b = items[i];
        o.position.set(b.x, b.y + b.h / 2, b.z);
        o.scale.set(b.w, b.h, b.d);
      },
      { cast: true, receive: true, color: (i) => items[i].color },
    );

    const tankGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.3, 10);
    const tankMat = new THREE.MeshStandardMaterial({ color: "#16181d", roughness: 0.5 });
    const tanks = makeInstanced(tankGeo, tankMat, city.tanks.length, (i, o) => {
      const t = city.tanks[i];
      o.position.set(t.x, t.y + 0.65, t.z);
    }, { cast: true });

    const atlas = signAtlas(city.config);
    const all = [...city.signs.map((s) => ({ s, board: false })), ...city.billboards.map((s) => ({ s, board: true }))];
    const signGeo = new THREE.PlaneGeometry(1, 1);
    const rect = new THREE.InstancedBufferAttribute(new Float32Array(all.length * 4), 4);
    all.forEach(({ s, board }, i) => {
      const r = atlas.rect(s.cell, board);
      rect.setXYZW(i, r[0], r[1], r[2], r[3]);
    });
    signGeo.setAttribute("aRect", rect);
    const signMat = makeSignMaterial(atlas.texture);
    const signs = makeInstanced(signGeo, signMat, all.length, (i, o) => {
      const { s } = all[i];
      o.position.set(s.x, s.y, s.z);
      o.rotation.y = s.rot;
      o.scale.set(s.w, s.h, 1);
    });

    const poleGeo = new THREE.CylinderGeometry(0.22, 0.28, 8.4, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: "#51565e", roughness: 0.6 });
    const poles = makeInstanced(poleGeo, poleMat, city.billboards.length, (i, o) => {
      const b = city.billboards[i];
      o.position.set(b.x, 4.2, b.z);
    }, { cast: true });
    const frames = makeInstanced(
      new THREE.BoxGeometry(14.5, 4, 0.4),
      poleMat,
      city.billboards.length,
      (i, o) => {
        const b = city.billboards[i];
        o.position.set(b.x - Math.sin(b.rot) * 0.25, b.y, b.z - Math.cos(b.rot) * 0.25);
        o.rotation.y = b.rot;
      },
      { cast: true },
    );

    return { buildings, tanks, signs, poles, frames, details, disposables: [boxGeo, buildingMat, tankGeo, tankMat, signGeo, signMat, atlas.texture, poleGeo, poleMat] };
  }, [city]);

  useEffect(
    () => () => {
      set.disposables.forEach((d) => d.dispose());
      set.details.forEach((m) => m.geometry.dispose());
    },
    [set],
  );

  return (
    <>
      <primitive object={set.buildings} />
      <primitive object={set.tanks} />
      <primitive object={set.signs} />
      <primitive object={set.poles} />
      <primitive object={set.frames} />
      {set.details.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
