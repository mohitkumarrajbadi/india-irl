/** Bus stops + stalls (animals live in Animals.tsx). */
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { busStop, chaiStall } from "@/gfx/props";
import { STALL_TINTS, type PropBuildCtx } from "./city-props-ctx";
import { registerDestMesh } from "./dest-register";

export function buildStreetLife(ctx: PropBuildCtx): void {
  const { city, add, disposables, registerDest } = ctx;

  const stopGeo = busStop();
  add(
    makeInstanced(
      stopGeo,
      vertexMat,
      city.busStops.length,
      (i, o) => {
        const b = city.busStops[i];
        o.position.set(b.x, 0, b.z);
        o.rotation.y = b.rot;
      },
      { cast: true, receive: true },
    ),
  );
  const stallGeo = chaiStall();
  const stallIdx = city.stalls.map((_, i) => i);
  const stallMesh = add(
    makeInstanced(
      stallGeo,
      vertexMat,
      city.stalls.length,
      (i, o) => {
        const s = city.stalls[i];
        o.position.set(s.x, 0, s.z);
        o.rotation.y = s.rot + Math.PI;
      },
      { cast: true, color: (i) => STALL_TINTS[city.stalls[i].v % STALL_TINTS.length] },
    ),
  );
  registerDestMesh(registerDest, "stall", stallMesh, city.stalls.length, stallIdx);

  disposables.push(stopGeo, stallGeo);
}
