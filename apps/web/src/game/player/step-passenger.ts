import { toast } from "@/game/store";
import { samplePeer } from "@/net/interp";
import type { Peer } from "@/net/store";
import { SPECS, seatWorld, type VehicleKind } from "@/vehicles/specs";
import { seatScratch } from "./constants.ts";
import type { PlayerState } from "./types.ts";

export function stepPassenger(s: PlayerState, peerMap: Map<string, Peer>, now: number): void {
  const driver = s.rideWith ? peerMap.get(s.rideWith) : undefined;
  if (!driver || driver.veh === 0 || driver.passenger || driver.snaps.length === 0) {
    s.mode = "foot";
    s.kind = 0;
    s.rideWith = null;
    toast("Your ride ended");
    return;
  }
  samplePeer(driver, now);
  const spec = SPECS[driver.veh as 1 | 2 | 3];
  seatWorld(spec, s.seat, driver.rx, driver.rz, driver.ryaw, seatScratch);
  s.x = seatScratch.x;
  s.z = seatScratch.z;
  s.facing = driver.ryaw;
  s.actual = Math.abs(driver.rspeed);
  s.ds.speed = driver.rspeed;
  s.kind = driver.veh as VehicleKind;
}
