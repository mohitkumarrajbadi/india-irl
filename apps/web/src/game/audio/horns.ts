/** Vehicle horns — layered, slightly imperfect Indian street character. */
import { getContext, sfxOut } from "./context.ts";
import { noiseBurst, tone } from "./synth.ts";

export function honk(kind: number, volume = 1): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest || volume < 0.02) return;
  const bus = ac.createGain();
  bus.gain.value = 0.16 * volume;
  bus.connect(dest);

  const pattern =
    kind === 1
      ? [
          { at: 0, len: 0.1, f: 495 },
          { at: 0.16, len: 0.14, f: 510 },
        ]
      : kind === 2
        ? [{ at: 0, len: 0.11, f: 780 }]
        : [
            { at: 0, len: 0.18, f: 310 },
            { at: 0.24, len: 0.24, f: 295 },
          ];

  for (const b of pattern) {
    tone(ac, bus, { f: b.f, at: b.at, len: b.len, type: "sawtooth", vol: 0.85, lp: 2200 });
    tone(ac, bus, { f: b.f * 1.245, at: b.at, len: b.len, type: "square", vol: 0.45, lp: 1800 });
    tone(ac, bus, { f: b.f * 0.5, at: b.at, len: b.len * 0.9, type: "sine", vol: 0.35, lp: 600 });
    noiseBurst(ac, bus, { at: b.at, len: 0.04, vol: 0.2, freq: 900, q: 0.5 });
  }
}
