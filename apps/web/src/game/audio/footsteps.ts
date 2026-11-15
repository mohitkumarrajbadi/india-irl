/** Grounded grit footsteps — cadence tracks walk/sprint speed. */
import { getContext, sfxOut } from "./context.ts";
import { noiseBurst, tone } from "./synth.ts";

let phase = 0;
let last = 0;

export function footstep(speed: number, dt: number): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest || speed < 0.55) {
    phase = 0;
    return;
  }
  const pace = Math.min(speed / 4.2, 1.85);
  phase += dt * (5.0 + pace * 4.8);
  if (phase < Math.PI) return;
  phase %= Math.PI;
  const now = performance.now();
  if (now - last < 85) return;
  last = now;

  const bus = ac.createGain();
  bus.gain.value = 0.055 * Math.min(1, 0.45 + pace * 0.55);
  bus.connect(dest);
  const heel = 240 + pace * 90 + Math.random() * 40;
  noiseBurst(ac, bus, { len: 0.045, vol: 1, freq: heel, q: 0.65 });
  noiseBurst(ac, bus, { len: 0.03, vol: 0.45, freq: heel * 2.1, q: 1.1, at: 0.012 });
  tone(ac, bus, { f: 70 + pace * 20, at: 0, len: 0.035, type: "sine", vol: 0.35, lp: 180 });
}
