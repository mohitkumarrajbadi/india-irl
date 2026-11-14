/** Merge look → BufferGeometry pack for the rig. */
import { GeoBuilder } from "../gfx/geo";
import {
  BOTTOM_COLORS,
  HAIR_COLORS,
  SHOE_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  type Look,
} from "./appearance";
import { buildFace, buildSkull } from "./face";
import {
  buildAirPods,
  buildBeard,
  buildBindi,
  buildGlasses,
  buildHeadphones,
  buildHoops,
} from "./gear";
import { buildHair } from "./hair";
import { buildForeArm, buildShin, buildThigh, buildUpperArm } from "./limbs";
import { BODY_H, BODY_W, HEAD_SCALE } from "./parts";
import { buildTorso } from "./torso";
import type { BufferGeometry } from "three";

export type Geos = {
  torso: BufferGeometry;
  head: BufferGeometry;
  upperArm: BufferGeometry;
  foreArm: BufferGeometry;
  thigh: BufferGeometry;
  shin: BufferGeometry;
  cup: BufferGeometry;
  height: number;
  shoulder: number;
  hipX: number;
};

export function buildGeos(look: Look): Geos {
  const bw = BODY_W[look.body];
  const bh = BODY_H[look.body];
  const skin = SKIN_TONES[look.skin];
  const hair = HAIR_COLORS[look.hairColor];
  const top = TOP_COLORS[look.topColor];
  const bottom = BOTTOM_COLORS[look.bottomColor];
  const shoeCol = SHOE_COLORS[look.shoeColor];
  const t = look.top;
  const b = look.bottom;
  const longSleeve = t === 1 || t === 2 || t === 3 || t === 6;
  const saree = t === 4;

  const tg = new GeoBuilder();
  const { torsoW } = buildTorso(tg, look, skin, top, bottom, bw);

  const hg = new GeoBuilder();
  buildSkull(hg, skin);
  buildFace(hg, skin, hair);
  buildHair(hg, look, hair);
  if (look.acc & 1) buildGlasses(hg);
  if (look.acc & 8) buildHeadphones(hg);
  else if (look.acc & 256) buildAirPods(hg);
  if (look.acc & 16) buildBindi(hg);
  if (look.acc & 32) buildBeard(hg, hair);
  if (look.acc & 128) buildHoops(hg);

  const armR = (t === 2 ? 0.052 : 0.048) * Math.sqrt(bw);
  const ua = new GeoBuilder();
  buildUpperArm(ua, armR, longSleeve || saree ? top : top);
  const fa = new GeoBuilder();
  buildForeArm(fa, armR, longSleeve ? top : skin, skin, look);

  const legR = (b === 5 ? 0.068 : 0.06) * Math.sqrt(bw);
  const longLeg = b === 0 || b === 1 || b === 5;
  const thighCol = longLeg || b === 2 ? bottom : skin;
  const shinCol = longLeg ? bottom : skin;
  const th = new GeoBuilder();
  buildThigh(th, legR, saree ? skin : thighCol);
  const sh = new GeoBuilder();
  buildShin(sh, legR * (b === 5 ? 1.05 : 1), saree ? skin : shinCol, shoeCol, look.shoe, skin);

  const cup = new GeoBuilder();
  cup.cyl(0.03, 0.025, 0.06, "#f4f0e6", { pos: [0, 0, 0] }, 10);
  cup.cyl(0.028, 0.028, 0.007, "#8a4b24", { pos: [0, 0.028, 0] }, 10);

  return {
    torso: tg.build(),
    head: hg.build(),
    upperArm: ua.build(),
    foreArm: fa.build(),
    thigh: th.build(),
    shin: sh.build(),
    cup: cup.build(),
    height: (1.52 + 0.2 * HEAD_SCALE) * bh + (look.hair === 4 ? 0.1 : 0),
    shoulder: torsoW + armR * 0.95,
    hipX: 0.088 * bw,
  };
}
