/**
 * Map chassis health → paint / crumple params (shared by mesh apply + tests).
 * health: 0 wrecked … 1 pristine
 */
export type ChassisVisual = {
  /** 0…1 lerp toward rust tone. */
  rustMix: number;
  /** Added roughness. */
  roughAdd: number;
  /** Metalness scale (1 = unchanged). */
  metalScale: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  bodyRotZ: number;
  bodyRotX: number;
  /** Glass opacity multiplier. */
  glassMul: number;
};

export function chassisVisual(health: number): ChassisVisual {
  const h = Math.max(0, Math.min(1, health));
  const dmg = 1 - h;
  return {
    rustMix: dmg * 0.62,
    roughAdd: dmg * 0.48,
    metalScale: 1 - dmg * 0.7,
    scaleX: 1 - dmg * 0.035,
    scaleY: 1 - dmg * 0.09,
    scaleZ: 1 - dmg * 0.055,
    bodyRotZ: dmg * 0.045,
    bodyRotX: -dmg * 0.025,
    glassMul: 1 - dmg * 0.55,
  };
}
