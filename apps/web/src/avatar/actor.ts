import * as THREE from "three";
import { labelTexture } from "../gfx/textures";
import { SPECS, seatWorld } from "../vehicles/specs";
import { createVehicle, type VehicleObject } from "../vehicles/object";
import type { CityConfig } from "../world/types";
import { quality } from "../game/quality";
import { TOP_COLORS, type Look } from "./appearance";
import { buildRig, poseRig, SEAT, SEAT_HIP_OFFSET, type Rig } from "./rig";

export type ActorFrame = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** 0 on foot, 1..3 vehicle kind. */
  vehicle: number;
  seat: number;
  emote: number;
  emoteT: number;
  /** Riding in someone else's vehicle: x/z are already the seat position. */
  passenger: boolean;
  roll: number;
  /** Ground height, used for the jump arc. */
  y: number;
  /** Turn indicators: -1 left, 0 off, 1 right. */
  blinker?: -1 | 0 | 1;
};

const seatPos = { x: 0, y: 0, z: 0 };

/**
 * One visible player: avatar rig, optional vehicle, name tag and chat bubble.
 * Imperative on purpose. A scene with thirty of these never touches React state per frame.
 */
export class Actor {
  readonly group = new THREE.Group();
  private rig: Rig;
  private vehicle: VehicleObject | null = null;
  private vehicleKey = "";
  private tag: THREE.Sprite;
  private bubble: THREE.Sprite;
  private phase = 0;
  private time = Math.random() * 10;
  private shadows = true;
  private bubbleUntil = 0;
  private bubbleTexture: THREE.Texture | null = null;
  private tagTexture: THREE.Texture | null = null;
  private readonly cfg: CityConfig;
  private readonly look: Look;
  private tagHeight = 2;
  private lodSkip = 0;

  constructor(look: Look, name: string, cfg: CityConfig) {
    this.cfg = cfg;
    this.look = look;
    this.rig = buildRig(look);
    this.group.add(this.rig.root);

    const mat = () => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false });
    this.tag = new THREE.Sprite(mat());
    this.bubble = new THREE.Sprite(mat());
    this.bubble.visible = false;
    this.tag.renderOrder = 10;
    this.bubble.renderOrder = 11;
    this.group.add(this.tag, this.bubble);
    this.setName(name);
  }

  setName(name: string): void {
    this.tagTexture?.dispose();
    const { texture, aspect } = labelTexture(name, { bg: "rgba(18,24,16,0.72)", fg: "#f3efe4", size: 30, maxWidth: 260 });
    this.tagTexture = texture;
    const mat = this.tag.material as THREE.SpriteMaterial;
    mat.map = texture;
    mat.needsUpdate = true;
    this.tag.scale.set(0.3 * aspect, 0.3, 1);
  }

  say(text: string, until: number): void {
    this.bubbleTexture?.dispose();
    const { texture, aspect } = labelTexture(text, { bg: "rgba(255,250,235,0.96)", fg: "#1c2418", size: 30, maxWidth: 360 });
    this.bubbleTexture = texture;
    const mat = this.bubble.material as THREE.SpriteMaterial;
    mat.map = texture;
    mat.needsUpdate = true;
    const h = 0.34;
    this.bubble.scale.set(h * aspect, h, 1);
    this.bubbleUntil = until;
    this.bubble.visible = true;
  }

  private ensureVehicle(kind: number): void {
    const key = kind > 0 ? `${kind}:${this.look.topColor}` : "";
    if (key === this.vehicleKey) return;
    if (this.vehicle) {
      this.vehicle.root.removeFromParent();
      this.vehicle = null;
    }
    this.vehicleKey = key;
    if (kind > 0) {
      this.vehicle = createVehicle(kind as 1 | 2 | 3, this.cfg, TOP_COLORS[this.look.topColor]);
      this.group.add(this.vehicle.root);
    }
  }

  /**
   * @param lod 0 near (full), 1 mid (half-rate pose), 2 far (pose every 3rd frame, no vehicle rebuild churn)
   */
  update(f: ActorFrame, dt: number, now: number, camX: number, camZ: number, lod = 0): void {
    const dx = f.x - camX;
    const dz = f.z - camZ;
    const dist2 = dx * dx + dz * dz;
    const q = quality.active;
    const cull = q.avatarCull;
    if (dist2 > cull * cull) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const shadowR = q.avatarShadow;
    const wantShadow = lod === 0 && shadowR > 0 && dist2 < shadowR * shadowR;
    if (wantShadow !== this.shadows) {
      this.shadows = wantShadow;
      for (const m of this.rig.meshes) m.castShadow = wantShadow && m !== this.rig.cup;
    }

    this.time += dt;
    const driving = f.vehicle > 0 && !f.passenger;
    this.ensureVehicle(driving ? f.vehicle : 0);

    const rigRoot = this.rig.root;
    let seat: number = SEAT.stand;
    let tagY = this.rig.height + 0.32;
    this.group.position.set(f.x, 0, f.z);
    this.group.rotation.y = 0;

    if (driving && this.vehicle) {
      const spec = SPECS[f.vehicle as 1 | 2 | 3];
      this.vehicle.root.position.set(0, 0, 0);
      this.vehicle.root.rotation.y = f.yaw;
      this.vehicle.tilt.rotation.z = lod === 0 ? f.roll : 0;
      const side = f.blinker ?? 0;
      const flash = side !== 0 && Math.floor(now / 350) % 2 === 0;
      this.vehicle.setBlinkers(side, flash);
      seatWorld(spec, 0, 0, 0, f.yaw, seatPos);
      rigRoot.position.set(seatPos.x, spec.seats[0].y - SEAT_HIP_OFFSET, seatPos.z);
      rigRoot.rotation.set(0, f.yaw, lod === 0 ? f.roll * 0.8 : 0);
      seat = spec.seats[0].pose;
      tagY = f.vehicle === 3 ? 2.15 : f.vehicle === 1 ? 2.35 : this.rig.height + 0.42;
    } else if (f.passenger && f.vehicle > 0) {
      const spec = SPECS[f.vehicle as 1 | 2 | 3];
      const s = spec.seats[Math.min(f.seat, spec.seats.length - 1)];
      rigRoot.position.set(0, s.y - SEAT_HIP_OFFSET, 0);
      rigRoot.rotation.set(0, f.yaw, 0);
      seat = s.pose;
      tagY = f.vehicle === 3 ? 2.15 : f.vehicle === 1 ? 2.35 : this.rig.height + 0.42;
    } else {
      rigRoot.position.set(0, f.y, 0);
      rigRoot.rotation.set(0, f.yaw, 0);
      this.phase += f.speed * dt * 2.15;
    }

    // Mid/far: skip most pose work — position still updates every frame.
    this.lodSkip += 1;
    const poseEvery = lod === 0 ? 1 : lod === 1 ? 2 : 3;
    if (this.lodSkip % poseEvery === 0) {
      poseRig(
        this.rig,
        {
          phase: this.phase,
          speed: seat === SEAT.stand ? f.speed : 0,
          emote: lod < 2 ? f.emote : 0,
          emoteT: f.emoteT,
          seat,
          time: this.time,
          lean: lod === 0 ? f.roll : 0,
        },
        dt * poseEvery,
      );
    }

    this.tag.position.set(0, tagY, 0);
    const tagR = q.nameTag;
    this.tag.visible = lod < 2 && dist2 < tagR * tagR;
    if (this.bubble.visible) {
      if (now > this.bubbleUntil || dist2 > 60 * 60) this.bubble.visible = false;
      this.bubble.position.set(0, tagY + 0.3, 0);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.tagTexture?.dispose();
    this.bubbleTexture?.dispose();
    (this.tag.material as THREE.Material).dispose();
    (this.bubble.material as THREE.Material).dispose();
  }
}
