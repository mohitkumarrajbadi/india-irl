import assert from "node:assert/strict";
import { tallyInstanceInventory } from "./instance-inventory.ts";

const root = {
  type: "Group",
  children: [
    { type: "Mesh", isMesh: true, frustumCulled: true },
    {
      type: "InstancedMesh",
      isMesh: true,
      isInstancedMesh: true,
      frustumCulled: false,
    },
    {
      type: "Group",
      children: [{ type: "Mesh", isMesh: true, frustumCulled: false }],
    },
  ],
};

const t = tallyInstanceInventory(root);
assert.equal(t.nodes, 5);
assert.equal(t.meshes, 3);
assert.equal(t.instancedMeshes, 1);
assert.equal(t.plainMeshes, 2);
assert.equal(t.frustumCulledOff, 2);

assert.equal(tallyInstanceInventory(null).nodes, 0);

console.log("instance-inventory.test.ts ok");
