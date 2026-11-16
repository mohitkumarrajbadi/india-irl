/**
 * Shared remote snapshot interpolation defaults (≈15 Hz snaps → display).
 * Keep client legacy linear path and Hermite sampler in lockstep.
 */

/** How far behind wall-clock we sample (ms). Absorbs jitter. */
export const REMOTE_INTERP_DELAY_MS = 110;

/** Cap forward extrapolation past the newest snap (ms). */
export const REMOTE_MAX_EXTRAPOLATE_MS = 160;
