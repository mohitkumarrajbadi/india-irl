/** Fruit carts, shrines, cranes, signals, breakers, auto stands. */
import type * as THREE from "three";
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import {
  autoStand,
  crane,
  flowerCart,
  fruitCart,
  newsStand,
  roadsideShrine,
  speedBreaker,
  trafficSignal,
  waterTanker,
} from "@/gfx/props";
import type { PropBuildCtx } from "./city-props-ctx";
import { registerDestMesh } from "./dest-register";

export function buildExtras(ctx: PropBuildCtx): void {
  const { city, add, disposables, registerDest } = ctx;
  const idxs = (k: number) =>
    city.extras.map((e, i) => (e.v === k ? i : -1)).filter((i) => i >= 0);
  const byKind = (k: number) => city.extras.filter((e) => e.v === k);
  const placeExtra = (list: typeof city.extras, faceRoad = false) => (i: number, o: THREE.Object3D) => {
    o.position.set(list[i].x, 0, list[i].z);
    o.rotation.y = faceRoad ? list[i].rot : list[i].rot + Math.PI;
    o.scale.setScalar(list[i].s);
  };
  const fruit = byKind(0);
  const flowers = byKind(1);
  const shrines = byKind(2);
  const cranes = byKind(3);
  const news = byKind(4);
  const tankers = byKind(5);
  const signals = byKind(6);
  const breakers = byKind(7);
  const stands = byKind(8);
  const fruitGeo = fruitCart();
  const flowerGeo = flowerCart();
  const shrineGeo = roadsideShrine();
  const craneGeo = crane();
  const newsGeo = newsStand();
  const tankerGeo = waterTanker();
  const signalGeo = trafficSignal();
  const breakerGeo = speedBreaker();
  const standGeo = autoStand();
  const fruitMesh = add(makeInstanced(fruitGeo, vertexMat, fruit.length, placeExtra(fruit), { cast: true, receive: true }));
  const flowerMesh = add(makeInstanced(flowerGeo, vertexMat, flowers.length, placeExtra(flowers), { cast: true, receive: true }));
  const shrineMesh = add(makeInstanced(shrineGeo, vertexMat, shrines.length, placeExtra(shrines), { cast: true, receive: true }));
  add(makeInstanced(craneGeo, vertexMat, cranes.length, placeExtra(cranes), { cast: true }));
  const newsMesh = add(makeInstanced(newsGeo, vertexMat, news.length, placeExtra(news), { cast: true, receive: true }));
  add(makeInstanced(tankerGeo, vertexMat, tankers.length, placeExtra(tankers), { cast: true, receive: true }));
  const signalMesh = add(makeInstanced(signalGeo, vertexMat, signals.length, placeExtra(signals, true), { cast: true }));
  add(
    makeInstanced(
      breakerGeo,
      vertexMat,
      breakers.length,
      (i, o) => {
        o.position.set(breakers[i].x, 0, breakers[i].z);
        o.rotation.y = breakers[i].rot - Math.PI / 2;
        o.scale.setScalar(breakers[i].s);
      },
      { receive: true },
    ),
  );
  const standMesh = add(makeInstanced(standGeo, vertexMat, stands.length, placeExtra(stands), { cast: true, receive: true }));
  registerDestMesh(registerDest, "extra", fruitMesh, city.extras.length, idxs(0));
  registerDestMesh(registerDest, "extra", flowerMesh, city.extras.length, idxs(1));
  registerDestMesh(registerDest, "extra", shrineMesh, city.extras.length, idxs(2));
  registerDestMesh(registerDest, "extra", newsMesh, city.extras.length, idxs(4));
  registerDestMesh(registerDest, "extra", signalMesh, city.extras.length, idxs(6));
  registerDestMesh(registerDest, "extra", standMesh, city.extras.length, idxs(8));
  disposables.push(fruitGeo, flowerGeo, shrineGeo, craneGeo, newsGeo, tankerGeo, signalGeo, breakerGeo, standGeo);
}
