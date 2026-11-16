/**
 * Lightweight scene-graph draw/instance inventory (Phase 10 pass).
 * Duck-typed so node tests need no Three runtime.
 */

export type SceneNodeLike = {
  type?: string;
  isMesh?: boolean;
  isInstancedMesh?: boolean;
  frustumCulled?: boolean;
  children?: readonly SceneNodeLike[];
};

export type InstanceInventory = {
  meshes: number;
  instancedMeshes: number;
  /** Non-instanced Mesh draw proxies (each Mesh ≈ ≥1 draw). */
  plainMeshes: number;
  frustumCulledOff: number;
  nodes: number;
};

export function tallyInstanceInventory(root: SceneNodeLike | null | undefined): InstanceInventory {
  const out: InstanceInventory = {
    meshes: 0,
    instancedMeshes: 0,
    plainMeshes: 0,
    frustumCulledOff: 0,
    nodes: 0,
  };
  if (!root) return out;

  const stack: SceneNodeLike[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    out.nodes += 1;
    const instanced = !!(n.isInstancedMesh || n.type === "InstancedMesh");
    const mesh = !!(n.isMesh || n.type === "Mesh" || instanced);
    if (mesh) {
      out.meshes += 1;
      if (instanced) out.instancedMeshes += 1;
      else out.plainMeshes += 1;
    }
    if (n.frustumCulled === false) out.frustumCulledOff += 1;
    const kids = n.children;
    if (kids) for (let i = kids.length - 1; i >= 0; i -= 1) stack.push(kids[i]!);
  }
  return out;
}
