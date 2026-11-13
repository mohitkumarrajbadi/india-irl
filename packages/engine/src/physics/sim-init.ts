/** Rapier world bootstrap + start fixed loop. */
import type RAPIER from "@dimforge/rapier3d-compat";
import { SIM_PROTOCOL } from "./protocol.ts";
import type { WorkerRuntime } from "./sim-types.ts";
import { startLoop } from "./world-loop.ts";

export async function handleInit(
  rt: WorkerRuntime,
  rapierMod: typeof RAPIER,
  gravity: number,
): Promise<void> {
  await rapierMod.init();
  rt.rapier = rapierMod;
  rt.world = new rapierMod.World({ x: 0, y: -Math.abs(gravity || 9.81), z: 0 });
  const ground = rt.world.createRigidBody(rapierMod.RigidBodyDesc.fixed());
  rt.world.createCollider(
    rapierMod.ColliderDesc.cuboid(2000, 0.05, 2000).setTranslation(0, -0.05, 0),
    ground,
  );
  rt.ready = true;
  rt.post({ type: "READY", protocol: SIM_PROTOCOL });
  rt.post({ type: "EVENT", event: { type: "READY" } });
  startLoop(() => rt.world, rt.stores, rt.loop, rt.post, () => rt.ready);
}
