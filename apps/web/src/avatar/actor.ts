import * as THREE from "three";
import { labelTexture } from "../gfx/textures";
import { createVehicle, type VehicleObject } from "../vehicles/object";
import type { CityConfig } from "../world/types";
import { garageTopColor } from "../game/cosmetics";
import { TOP_COLORS, type Look } from "./appearance";
import { applyActorFrame } from "./actor-frame";
import type { ActorFrame } from "./actor-types";
import { buildRig, type Rig } from "./rig";

export type { ActorFrame } from "./actor-types";

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
    const tintIdx = kind === 2 ? garageTopColor(this.look.topColor) : this.look.topColor;
    const key = kind > 0 ? `${kind}:${tintIdx}` : "";
    if (key === this.vehicleKey) return;
    if (this.vehicle) {
      this.vehicle.root.removeFromParent();
      this.vehicle = null;
    }
    this.vehicleKey = key;
    if (kind > 0) {
      this.vehicle = createVehicle(
        kind as 1 | 2 | 3,
        this.cfg,
        TOP_COLORS[tintIdx % TOP_COLORS.length]!,
      );
      this.group.add(this.vehicle.root);
    }
  }

  update(f: ActorFrame, dt: number, now: number, camX: number, camZ: number, lod = 0): void {
    applyActorFrame(
      {
        group: this.group,
        rig: this.rig,
        vehicle: this.vehicle,
        tag: this.tag,
        bubble: this.bubble,
        phase: this.phase,
        time: this.time,
        shadows: this.shadows,
        bubbleUntil: this.bubbleUntil,
        lodSkip: this.lodSkip,
        ensureVehicle: (k) => this.ensureVehicle(k),
        setPhase: (n) => { this.phase = n; },
        setTime: (n) => { this.time = n; },
        setShadows: (v) => { this.shadows = v; },
        setLodSkip: (n) => { this.lodSkip = n; },
      },
      f,
      dt,
      now,
      camX,
      camZ,
      lod,
    );
  }

  dispose(): void {
    this.group.removeFromParent();
    this.tagTexture?.dispose();
    this.bubbleTexture?.dispose();
    (this.tag.material as THREE.Material).dispose();
    (this.bubble.material as THREE.Material).dispose();
  }
}
