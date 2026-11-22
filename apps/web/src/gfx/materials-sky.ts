import * as THREE from "three";
import { env, nightUniform } from "./env";

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
      /** Weather cloud cover 0…1 — drives monsoon overcast. */
      uCloud: { value: 0.05 },
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
      uniform float uNight; uniform float uTime; uniform float uCloud;
      varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
      float vnoise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
      }
      void main() {
        vec3 d = normalize(vDir);
        float y = max(d.y, 0.0);
        // Humid Indian haze: warm dusty horizon, softer zenith under cloud
        vec3 zen = mix(uZenith, uZenith * 0.72 + vec3(0.18, 0.2, 0.22), uCloud * 0.85);
        vec3 hor = mix(uHorizon, mix(uHorizon, vec3(0.55, 0.52, 0.48), 0.45), uCloud * 0.6);
        vec3 col = mix(hor, zen, pow(y, 0.5));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        float day = 1.0 - uNight;
        float sunMul = (1.0 - uCloud * 0.82) * day;
        col += vec3(1.0, 0.82, 0.55) * (pow(sd, 700.0) * 6.0 + pow(sd, 14.0) * 0.35) * sunMul;
        float md = max(dot(d, normalize(vec3(-uSunDir.x, -uSunDir.y, -uSunDir.z))), 0.0);
        col += vec3(0.8, 0.88, 1.0) * pow(md, 900.0) * 2.5 * uNight;
        vec2 sp = d.xz / (d.y + 0.25) * 70.0;
        float star = step(0.9965, h21(floor(sp))) * smoothstep(0.08, 0.35, d.y);
        col += vec3(star) * uNight * 0.9 * (1.0 - uCloud);
        vec2 cp = d.xz / (d.y * 0.7 + 0.28) * 1.8 + vec2(uTime * 0.012, 0.0);
        float cl = vnoise(cp) * 0.55 + vnoise(cp * 2.1) * 0.3 + vnoise(cp * 4.3) * 0.15;
        // Lower threshold as cover rises so monsoon fills the sky
        float thr = mix(0.58, 0.28, clamp(uCloud, 0.0, 1.0));
        float cloud = smoothstep(thr, thr + 0.28, cl) * smoothstep(0.0, 0.18, d.y);
        float cover = mix(0.35, 0.92, clamp(uCloud, 0.0, 1.0));
        vec3 cloudCol = mix(hor * 1.05 + 0.1, vec3(0.22, 0.24, 0.28), uCloud * 0.7);
        cloudCol = mix(cloudCol, vec3(0.06, 0.08, 0.14), uNight);
        col = mix(col, cloudCol, cloud * cover);
        // Storm grey wash
        col = mix(col, vec3(0.28, 0.3, 0.34), uCloud * uCloud * 0.35 * day);
        if (d.y < 0.0) col = mix(col, hor, smoothstep(0.0, -0.08, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Ring of hills on the horizon. Profile is fixed per city by `amount`. */
