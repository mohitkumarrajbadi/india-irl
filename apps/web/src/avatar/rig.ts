import * as THREE from "three";
import { lookKey, type Look } from "./appearance";
import { attachMemojiEyes } from "./eyes";
import { buildGeos, type Geos } from "./geos";
import { avatarMat } from "./materials";
import { BODY_H, HEAD_SCALE, HIP_Y, JOINT_COUNT, SEAT_HIP_OFFSET } from "./parts";

export { HEAD_SCALE, HIP_Y, SEAT_HIP_OFFSET };
export { EMOTES, SEAT, isCombatEmote, isDanceEmote, poseRig, type Pose } from "./pose";

export type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
  lArm: THREE.Group;
  rArm: THREE.Group;
  lElbow: THREE.Group;
  rElbow: THREE.Group;
  lLeg: THREE.Group;
  rLeg: THREE.Group;
  lKnee: THREE.Group;
  rKnee: THREE.Group;
  cup: THREE.Mesh;
  meshes: THREE.Mesh[];
  cur: Float32Array;
  height: number;
};

const cache = new Map<string, Geos>();
const GEO_VER = "v31-body-outfit";

export function buildRig(look: Look): Rig {
  const key = `${GEO_VER}:${lookKey(look)}`;
  let g = cache.get(key);
  if (!g) {
    if (cache.size > 80) cache.clear();
    g = buildGeos(look);
    cache.set(key, g);
  }
  const bh = BODY_H[look.body];
  const mesh = (geo: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(geo, avatarMat);
    m.castShadow = true;
    return m;
  };
  const grp = (x: number, y: number, z = 0) => {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    return o;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(bh);
  root.add(body);

  const torso = mesh(g.torso);
  body.add(torso);

  // Head root scaled for Memoji proportions; eyes parented so they share scale
  const head = grp(0, 1.34);
  const headRoot = new THREE.Group();
  headRoot.scale.setScalar(HEAD_SCALE);
  const headMesh = mesh(g.head);
  headRoot.add(headMesh);
  const eyeMeshes = attachMemojiEyes(headRoot);
  head.add(headRoot);
  body.add(head);

  const lArm = grp(g.shoulder, 1.28);
  const rArm = grp(-g.shoulder, 1.28);
  // Nest deltoids into the torso shoulder shelf
  lArm.position.z = 0.015;
  rArm.position.z = 0.015;
  const lElbow = grp(0, -0.26);
  const rElbow = grp(0, -0.26);
  // Y-first so palm twist (Y) doesn't fight elbow bend (X) during namaste / wave
  lArm.rotation.order = "YXZ";
  rArm.rotation.order = "YXZ";
  lElbow.rotation.order = "YXZ";
  rElbow.rotation.order = "YXZ";
  const arms = [mesh(g.upperArm), mesh(g.upperArm), mesh(g.foreArmL), mesh(g.foreArmR)];
  lArm.add(arms[0]);
  rArm.add(arms[1]);
  lElbow.add(arms[2]);
  rElbow.add(arms[3]);
  lArm.add(lElbow);
  rArm.add(rElbow);
  body.add(lArm, rArm);

  const cup = mesh(g.cup);
  cup.castShadow = false;
  cup.position.set(0, -0.265, 0.05);
  cup.visible = false;
  rElbow.add(cup);

  const lLeg = grp(g.hipX, HIP_Y);
  const rLeg = grp(-g.hipX, HIP_Y);
  const lKnee = grp(0, -0.4);
  const rKnee = grp(0, -0.4);
  const legs = [mesh(g.thigh), mesh(g.thigh), mesh(g.shin), mesh(g.shin)];
  lLeg.add(legs[0]);
  rLeg.add(legs[1]);
  lKnee.add(legs[2]);
  rKnee.add(legs[3]);
  lLeg.add(lKnee);
  rLeg.add(rKnee);
  body.add(lLeg, rLeg);

  return {
    root,
    body,
    head,
    torso,
    lArm,
    rArm,
    lElbow,
    rElbow,
    lLeg,
    rLeg,
    lKnee,
    rKnee,
    cup,
    meshes: [torso, headMesh, ...eyeMeshes, ...arms, ...legs, cup],
    cur: new Float32Array(JOINT_COUNT),
    height: g.height,
  };
}
