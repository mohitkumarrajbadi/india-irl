/** Rapier world bootstrap + start fixed loop. */
import type RAPIER from "@dimforge/rapier3d-compat";
import { clearFailsafes } from "./failsafe.ts";
import { GROUND_FRICTION, GROUND_RESTITUTION } from "./materials.ts";
import { SIM_PROTOCOL } from "./protocol.ts";
import type { WorkerRuntime } from "./sim-types.ts";
import { startLoop } from "./world-loop.ts";

export async function handleInit(
  rt: WorkerRuntime,
  rapierMod: typeof RAPIER,
  gravity: number,
): Promise<void> {
  await rapierMod.init();
  clearFailsafes();
  rt.rapier = rapierMod;
  rt.world = new rapierMod.World({ x: 0, y: -Math.abs(gravity || 9.81), z: 0 });
  // Soft underlay — streamed road trimeshes are the authority surface.
  const ground = rt.world.createRigidBody(rapierMod.RigidBodyDesc.fixed());
  rt.world.createCollider(
    rapierMod.ColliderDesc.cuboid(2000, 0.05, 2000)
      .setTranslation(0, -0.08, 0)
      .setFriction(GROUND_FRICTION)
      .setRestitution(GROUND_RESTITUTION),
    ground,
  );
  rt.ready = true;
  rt.post({ type: "READY", protocol: SIM_PROTOCOL });
  rt.post({ type: "EVENT", event: { type: "READY" } });
  startLoop(() => rt.world, rt.stores, rt.loop, rt.post, () => rt.ready);
}
