/** Fixed-step accumulator + per-tick orchestration. */
import type RAPIER from "@dimforge/rapier3d-compat";
import { TICK_DT } from "../../../shared/src/index.ts";
import { stepCharacter } from "./character.ts";
import { packSnapshot } from "./snapshot.ts";
import type { PostFn, SimStores } from "./sim-types.ts";
import { stepVehicles } from "./vehicle-step.ts";
import { type LoopState } from "./loop-state.ts";

export type { LoopState };
export { createLoopState } from "./loop-state.ts";

export function fixedUpdate(
  world: RAPIER.World,
  stores: SimStores,
  loop: LoopState,
  post: PostFn,
): void {
  const local = stores.chars.get(stores.localId);
  if (local) stepCharacter(local, stores.input, TICK_DT);
  stepVehicles({
    vehicles: stores.vehicles,
    chars: stores.chars,
    input: stores.input,
    drivingVehicleId: stores.drivingVehicleId,
    localId: stores.localId,
    dt: TICK_DT,
    post,
  });
  world.step();
  loop.tick += 1;
  stores.input.actions.length = 0;
  stores.input.jump = false;
  stores.input.interact = false;

  const { count, copy } = packSnapshot(loop.snapBuf, stores.chars.values(), stores.vehicles.values());
  post({ type: "SNAPSHOT", tick: loop.tick, data: copy, count }, [copy.buffer]);
}

export function startLoop(
  getWorld: () => RAPIER.World | null,
  stores: SimStores,
  loop: LoopState,
  post: PostFn,
  isReady: () => boolean,
): void {
  loop.lastNow = performance.now();
  const frame = () => {
    const world = getWorld();
    if (!world || !isReady()) {
      loop.raf = requestAnimationFrame(frame);
      return;
    }
    const now = performance.now();
    loop.acc += Math.min(0.05, (now - loop.lastNow) / 1000);
    loop.lastNow = now;
    let guard = 0;
    while (loop.acc >= TICK_DT && guard < 5) {
      fixedUpdate(world, stores, loop, post);
      loop.acc -= TICK_DT;
      guard += 1;
    }
    loop.raf = requestAnimationFrame(frame);
  };
  loop.raf = requestAnimationFrame(frame);
}
