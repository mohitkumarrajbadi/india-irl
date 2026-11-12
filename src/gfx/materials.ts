import * as THREE from "three";
import { env, nightUniform } from "./env";

/**
 * Buildings are one InstancedMesh of unit boxes. Windows, balconies and shop
 * shutters are drawn procedurally per fragment from the instance's own size,
 * so any footprint gets evenly spaced windows with no texture stretching.
 *
 * Per-instance attribute `aStyle` = (style 0 flats | 1 glass | 2 shops, seed).
 */
export function makeBuildingMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = nightUniform;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute vec2 aStyle;
         varying vec2 vStyle;
         varying vec3 vLocal;
         varying vec3 vNrmL;
         varying vec3 vDim;
         varying float vBase;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vStyle = aStyle;
         vLocal = position;
         vNrmL = normal;
         #ifdef USE_INSTANCING
           vDim = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
           vBase = instanceMatrix[3].y - vDim.y * 0.5;
         #else
           vDim = vec3(1.0); vBase = 0.0;
         #endif`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uNight;
         varying vec2 vStyle;
         varying vec3 vLocal;
         varying vec3 vNrmL;
         varying vec3 vDim;
         varying float vBase;
         float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         vec3 winEmit = vec3(0.0);
         {
           float style = vStyle.x;
           float seed = vStyle.y * 91.7;
           bool roof = abs(vNrmL.y) > 0.5;
           if (roof) {
             float g = h21(floor((vLocal.xz + 0.5) * vDim.xz * 1.5) + seed);
             diffuseColor.rgb *= 0.62 + 0.14 * g;
           } else {
             bool alongZ = abs(vNrmL.x) > 0.5;
             float width = alongZ ? vDim.z : vDim.x;
             float u = ((alongZ ? vLocal.z : vLocal.x) + 0.5) * width;
             float v = (vLocal.y + 0.5) * vDim.y + vBase;
             float cellW = style > 0.5 && style < 1.5 ? 1.7 : (style > 1.5 ? 2.5 : 3.1);
             float floorH = style > 0.5 && style < 1.5 ? 3.6 : 3.3;
             float cols = max(1.0, floor(width / cellW));
             float cw = width / cols;
             float cu = u / cw;
             float fu = fract(cu);
             float iu = floor(cu);
             float cv = v / floorH;
             float fv = fract(cv);
             float iv = floor(cv);
             float rnd = h21(vec2(iu + seed, iv * 1.7 + seed * 0.37));
             float edge = min(u, width - u);
             bool inWin = false;
             vec3 glassCol = vec3(0.0);
             float litP = 0.4;
             if (style < 0.5) {
               inWin = fu > 0.2 && fu < 0.8 && fv > 0.3 && fv < 0.8 && edge > 0.9 && v > 0.9;
               glassCol = vec3(0.07, 0.10, 0.13);
               if (fv < 0.07) diffuseColor.rgb *= 0.78;
             } else if (style < 1.5) {
               inWin = fu > 0.06 && fu < 0.94 && fv > 0.1 && fv < 0.92 && edge > 0.35 && v > 0.4;
               float sky = 0.22 + 0.26 * smoothstep(0.0, 120.0, v);
               glassCol = mix(vec3(0.05, 0.1, 0.15), vec3(0.34, 0.5, 0.64), sky + 0.1 * rnd);
               litP = 0.55;
               if (!inWin) diffuseColor.rgb *= 0.55;
             } else {
               bool shopFloor = v < 4.4;
               if (shopFloor) {
                 float band = step(0.5, fract(u * 0.55 + seed));
                 bool shutter = v < 2.6 && edge > 0.5;
                 diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.52, 0.55) * (0.85 + 0.15 * band), shutter ? 0.85 : 0.0);
                 inWin = v > 2.7 && v < 4.1 && fu > 0.1 && fu < 0.9 && edge > 0.5;
                 glassCol = vec3(0.12, 0.1, 0.07);
                 litP = 0.85;
               } else {
                 inWin = fu > 0.2 && fu < 0.8 && fv > 0.3 && fv < 0.78 && edge > 0.7;
                 glassCol = vec3(0.07, 0.09, 0.11);
                 if (fv < 0.07) diffuseColor.rgb *= 0.8;
               }
             }
             if (inWin) {
               bool lit = rnd < litP * (0.55 + 0.7 * h21(vec2(iv, seed)));
               vec3 warm = style > 0.5 && style < 1.5 ? vec3(0.66, 0.82, 1.0) : mix(vec3(1.0, 0.72, 0.4), vec3(1.0, 0.92, 0.75), rnd);
               diffuseColor.rgb = glassCol * mix(1.0, 0.25, uNight);
               winEmit += glassCol * (1.0 - uNight) * (style > 0.5 && style < 1.5 ? 0.5 : 0.2);
               if (lit) winEmit = warm * (0.55 + 0.9 * rnd) * (0.08 + 1.5 * uNight);
             }
             diffuseColor.rgb *= 0.9 + 0.1 * smoothstep(0.0, 14.0, v);
           }
         }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += winEmit;`,
      );
  };
  mat.customProgramCacheKey = () => "india-irl-building";
  return mat;
}

export function makeSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: env.zenith },
      uHorizon: { value: env.horizon },
      uSunDir: { value: env.sunDir },
      uNight: nightUniform,
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir;
      uniform float uNight; uniform float uTime;
      varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
      float vnoise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
      }
      void main() {
        vec3 d = normalize(vDir);
        float y = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uZenith, pow(y, 0.5));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        float day = 1.0 - uNight;
        col += vec3(1.0, 0.82, 0.55) * (pow(sd, 700.0) * 6.0 + pow(sd, 14.0) * 0.35) * day;
        float md = max(dot(d, normalize(vec3(-uSunDir.x, -uSunDir.y, -uSunDir.z))), 0.0);
        col += vec3(0.8, 0.88, 1.0) * pow(md, 900.0) * 2.5 * uNight;
        vec2 sp = d.xz / (d.y + 0.25) * 70.0;
        float star = step(0.9965, h21(floor(sp))) * smoothstep(0.08, 0.35, d.y);
        col += vec3(star) * uNight * 0.9;
        vec2 cp = d.xz / (d.y * 0.7 + 0.28) * 1.8 + vec2(uTime * 0.012, 0.0);
        float cl = vnoise(cp) * 0.55 + vnoise(cp * 2.1) * 0.3 + vnoise(cp * 4.3) * 0.15;
        float cloud = smoothstep(0.52, 0.82, cl) * smoothstep(0.0, 0.22, d.y);
        vec3 cloudCol = mix(uHorizon * 1.08 + 0.12, vec3(0.06, 0.08, 0.14), uNight);
        col = mix(col, cloudCol, cloud * 0.62);
        if (d.y < 0.0) col = mix(col, uHorizon, smoothstep(0.0, -0.08, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Ring of hills on the horizon. Profile is fixed per city by `amount`. */
export function makeHillGeometry(amount: number, seed: number): THREE.BufferGeometry {
  const seg = 160;
  const R = 560;
  const g = new THREE.CylinderGeometry(R, R, 1, seg, 1, true);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const top = pos.getY(i) > 0;
    if (!top) {
      pos.setY(i, -30);
      continue;
    }
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const n =
      Math.sin(a * 3 + seed) * 0.5 +
      Math.sin(a * 7 + seed * 2.1) * 0.3 +
      Math.sin(a * 17 + seed * 0.7) * 0.15 +
      Math.sin(a * 41 + seed) * 0.05;
    const mask = Math.max(0, n * 0.5 + 0.35 - (1 - amount) * 0.7);
    pos.setY(i, 6 + mask * 110 * amount + amount * 10);
  }
  g.computeBoundingSphere();
  return g;
}
