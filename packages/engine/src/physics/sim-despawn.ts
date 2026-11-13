/** Remove a vehicle rigid body from the sim world. */
import type { WorkerRuntime } from "./sim-types.ts";

export function despawnVehicle(rt: WorkerRuntime, id: number): void {
  const v = rt.stores.vehicles.get(id);
  if (!v || !rt.world) return;
  rt.world.removeRigidBody(v.controller.body);
  rt.stores.vehicles.delete(id);
  if (rt.stores.drivingVehicleId === id) rt.stores.drivingVehicleId = 0;
  for (const ch of rt.stores.chars.values()) {
    if (ch.vehicleId === id) {
      ch.vehicleId = 0;
      ch.seat = 0;
    }
  }
}
