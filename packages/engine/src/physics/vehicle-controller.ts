/**
 * Raycast vehicle: virtual wheels, chassis rigid body, authority-gated drive.
 */
import type RAPIER from "@dimforge/rapier3d-compat";
import { clamp, rotateVec, yawVec } from "./math3.ts";
import { applyWheelForces, type WheelState } from "./vehicle-suspension.ts";
import type { VehicleTuning } from "./vehicle-tuning.ts";

export class RaycastVehicleController {
  readonly body: RAPIER.RigidBody;
  readonly tuning: VehicleTuning;
  readonly wheels: WheelState[];
  throttle = 0;
  steer = 0;
  brake = 0;
  handbrake = false;
  authority = true;

  private readonly rapier: typeof RAPIER;
  private readonly world: RAPIER.World;

  constructor(
    rapier: typeof RAPIER,
    world: RAPIER.World,
    body: RAPIER.RigidBody,
    tuning: VehicleTuning,
  ) {
    this.rapier = rapier;
    this.world = world;
    this.body = body;
    this.tuning = tuning;
    this.wheels = tuning.wheels.map(() => ({ compression: 0, grounded: false, contactY: 0 }));
  }

  setControls(throttle: number, steer: number, brake: number, handbrake: boolean): void {
    this.throttle = clamp(throttle, -1, 1);
    this.steer = clamp(steer, -1, 1);
    this.brake = clamp(brake, 0, 1);
    this.handbrake = handbrake;
  }

  step(dt: number): void {
    if (!this.authority) return;
    const pos = this.body.translation();
    const rot = this.body.rotation();
    const linvel = this.body.linvel();
    const angvel = this.body.angvel();
    this.body.setAngvel({ x: angvel.x * 0.92, y: angvel.y * 0.88, z: angvel.z * 0.92 }, true);

    const forward = rotateVec({ x: 0, y: 0, z: 1 }, rot);
    const right = rotateVec({ x: 1, y: 0, z: 0 }, rot);
    const grounded = applyWheelForces({
      rapier: this.rapier,
      world: this.world,
      body: this.body,
      tuning: this.tuning,
      wheels: this.wheels,
      pos,
      rot,
      linvel,
      right,
      dt,
    });
    if (!grounded) return;
    this.applyDrive(forward, right, linvel, dt);
  }

  translation() {
    return this.body.translation();
  }

  rotation() {
    return this.body.rotation();
  }

  speed(): number {
    return Math.abs(this.signedSpeed());
  }

  /** Forward-axis signed speed (m/s); negative = reverse. */
  signedSpeed(): number {
    const v = this.body.linvel();
    const forward = rotateVec({ x: 0, y: 0, z: 1 }, this.body.rotation());
    return v.x * forward.x + v.z * forward.z;
  }

  private applyDrive(
    forward: { x: number; y: number; z: number },
    right: { x: number; y: number; z: number },
    linvel: { x: number; y: number; z: number },
    dt: number,
  ): void {
    const steerAngle = this.steer * this.tuning.maxSteer;
    const steerFwd = yawVec(forward, steerAngle);
    const along = linvel.x * forward.x + linvel.z * forward.z;
    const drive =
      this.throttle * this.tuning.maxForce * dt -
      Math.sign(along) * this.brake * this.tuning.brakeForce * dt;
    const hb = this.handbrake ? this.tuning.handbrakeForce * dt : 0;
    this.body.applyImpulse(
      { x: steerFwd.x * drive - right.x * hb * 0.02, y: 0, z: steerFwd.z * drive - right.z * hb * 0.02 },
      true,
    );
    const speed = Math.hypot(linvel.x, linvel.z);
    if (speed > 0.4) {
      this.body.applyTorqueImpulse({ x: 0, y: steerAngle * speed * 0.35, z: 0 }, true);
    }
    if (this.tuning.leanGain > 0) {
      const lean = -steerAngle * this.tuning.leanGain * Math.min(1, speed / 12);
      this.body.applyTorqueImpulse({ x: 0, y: 0, z: lean * 40 }, true);
    }
  }
}
