/**
 * Surface finish for merged vertex-colour meshes. Each vertex carries its own
 * gloss + metal (`surf` attribute), so skin, paintwork, chrome and rubber can
 * live in one geometry and one draw call.
 */
import * as THREE from "three";

/** A colour with a finish. `rough` 0 → use the material default. */
export type Paint = { color: THREE.ColorRepresentation; rough?: number; metal?: number };
export type Ink = THREE.ColorRepresentation | Paint;

const tmp = new THREE.Color();

/** Linear RGB + (rough, metal) for an ink, written into `out` at `o`. */
export function inkInto(ink: Ink, out: Float32Array, o: number): void {
  const paint = typeof ink === "object" && !(ink as THREE.Color).isColor ? (ink as Paint) : null;
  tmp.set(paint ? paint.color : (ink as THREE.ColorRepresentation));
  out[o] = tmp.r;
  out[o + 1] = tmp.g;
  out[o + 2] = tmp.b;
  out[o + 3] = paint?.rough ?? 0;
  out[o + 4] = paint?.metal ?? 0;
}

// Finishes shared by every model so the whole world reads as one material family.
export const gloss = (color: THREE.ColorRepresentation, rough = 0.3): Paint => ({ color, rough });
export const matte = (color: THREE.ColorRepresentation, rough = 0.9): Paint => ({ color, rough });
export const CHROME: Paint = { color: "#d5dade", rough: 0.2, metal: 1 };
export const STEEL: Paint = { color: "#8d949c", rough: 0.42, metal: 0.85 };
export const RUBBER: Paint = { color: "#17181b", rough: 0.88 };
export const LENS_WARM: Paint = { color: "#fff1c4", rough: 0.12 };
export const LENS_RED: Paint = { color: "#d7202b", rough: 0.14 };
export const LENS_AMBER: Paint = { color: "#ffa51f", rough: 0.14 };

const registry = new Set<THREE.MeshStandardMaterial>();

/** Every material made here, so reflections can be attached in one place. */
export function surfaceMaterials(): ReadonlySet<THREE.MeshStandardMaterial> {
  return registry;
}

/** Standard material that reads per-vertex colour, roughness and metalness. */
export function surfaceMaterial(params: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, ...params });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 surf;\nvarying vec2 vSurf;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSurf = surf;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vSurf;")
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nif (vSurf.x > 0.0) roughnessFactor = vSurf.x;",
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nmetalnessFactor = max(metalnessFactor, vSurf.y);",
      );
  };
  mat.customProgramCacheKey = () => "india-irl-surf";
  registry.add(mat);
  const dispose = mat.dispose.bind(mat);
  mat.dispose = () => {
    registry.delete(mat);
    dispose();
  };
  return mat;
}

/** Shared material for every merged prop, vehicle and landmark detail. */
export const vertexMat = surfaceMaterial();
