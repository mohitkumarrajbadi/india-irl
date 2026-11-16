/**
 * Shared atmosphere polish — wet roads, fog density, lamp bloom, headlights.
 * Pure helpers so CityGround / Atmosphere / lamps stay in sync.
 */

export function wetRoadParams(wet: number): {
  roughness: number;
  metalness: number;
  /** Multiply RGB (wet asphalt reads darker). */
  colorMul: number;
} {
  const w = Math.max(0, Math.min(1, wet));
  return {
    // Stay rough — high metalness was blowing white specular patches at dusk
    roughness: 0.94 - w * 0.28,
    metalness: Math.min(0.1, w * 0.1),
    colorMul: 1 - w * 0.16,
  };
}

/** Streetlamp head + ground pool bloom + real light intensity (wet streets scatter more). */
export function lampGlow(
  night: number,
  wet: number,
  fog: number,
): { head: number; poolOpacity: number; lightIntensity: number } {
  const n = Math.max(0, Math.min(1, night));
  // Come on early at dusk so streets are lit before the sun fully dies
  const lit = n < 0.06 ? 0 : Math.min(1, (n - 0.06) / 0.4);
  const bloom = 1 + wet * 0.55 + fog * 0.25;
  return {
    head: lit,
    // Soft amber pools — keep opacity modest (additive + hot core = white plates)
    poolOpacity: Math.min(0.38, lit * 0.32 * bloom),
    // Candela under ACES + rough asphalt — headlight-class, capped for GPU budget
    lightIntensity: lit * (180 + wet * 40 + fog * 20),
  };
}

export function fogDensity(base: number, fog: number, rain: number, wet: number): number {
  return base * (1 + fog * 2.85 + rain * 0.75 + wet * 0.4);
}

/** Player / traffic headlight intensity. */
export function headlightPower(night: number, rain: number, fog: number, wet: number): number {
  const need = Math.max(night * 1.05, rain * 0.58, fog * 0.42, wet * 0.28);
  // Strong enough to read asphalt under ACES without nuclear bloom
  return need * (160 + wet * 70 + fog * 35);
}

/** Soft ground mist opacity near camera. */
export function mistOpacity(fog: number, rain: number, night: number): number {
  const m = fog * 0.7 + rain * 0.25 + night * 0.08;
  return m < 0.08 ? 0 : Math.min(0.55, 0.12 + m * 0.55);
}

/** Rain bed gain multiplier when roads are wet (afterglow hiss). */
export function rainAudioMul(rain: number, wet: number): number {
  return Math.max(rain, wet * 0.45);
}
