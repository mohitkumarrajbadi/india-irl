/** Distance gating + volume for proximity voice. */
import { live } from "@/game/runtime";
import { VOICE_MAX_LINKS, VOICE_RANGE, VOICE_RANGE2 } from "./voice-const";
import type { VoiceMesh } from "./voice-mesh";

export function tickVoiceMesh(
  mesh: VoiceMesh,
  on: boolean,
  stream: MediaStream | null,
  speakerMuted: boolean,
  peers: { id: string; x: number; z: number; dist2?: number }[],
  speaking: number,
  setSpeaking: (n: number) => void,
): void {
  if (!on || !stream) {
    if (mesh.links.size) mesh.hangupAll(true);
    return;
  }

  const scores: { id: string; d2: number }[] = [];
  for (const p of peers) {
    const d2 = p.dist2 ?? (p.x - live.x) ** 2 + (p.z - live.z) ** 2;
    if (d2 <= VOICE_RANGE2) scores.push({ id: p.id, d2 });
  }
  scores.sort((a, b) => a.d2 - b.d2);
  const want = new Set(scores.slice(0, VOICE_MAX_LINKS).map((s) => s.id));

  for (const id of [...mesh.links.keys()]) {
    if (!want.has(id)) mesh.hangup(id, true);
  }
  for (const id of want) {
    if (!mesh.links.has(id)) void mesh.connect(id);
  }

  let next = 0;
  for (const p of peers) {
    const link = mesh.links.get(p.id);
    if (!link) continue;
    const d = Math.sqrt(p.dist2 ?? (p.x - live.x) ** 2 + (p.z - live.z) ** 2);
    const vol = speakerMuted
      ? 0
      : d >= VOICE_RANGE
        ? 0
        : Math.max(0.05, Math.pow(1 - d / VOICE_RANGE, 1.35));
    if (mesh.hasPositional()) {
      link.audio.volume = 0;
      const media = (link.audio.srcObject as MediaStream | null) ?? null;
      mesh.positionalGain(p.id, p.x, p.z, vol, media);
    } else {
      link.audio.volume = vol;
    }
    if (!link.audio.paused && vol > 0.08) next += 1;
  }
  if (next !== speaking) setSpeaking(next);
}
