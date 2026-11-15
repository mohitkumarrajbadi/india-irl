import type { Wire } from "./transport";
import {
  VOICE_MAX_LINKS,
  VOICE_RANGE,
  type PositionalSink,
  type SendFn,
  type VoiceModeSender,
  type VoiceUi,
} from "./voice-const";
import { VoiceMesh } from "./voice-mesh";
import { tickVoiceMesh } from "./voice-tick";

export { VOICE_MAX_LINKS, VOICE_RANGE } from "./voice-const";
export type { PositionalSink, VoiceUi } from "./voice-const";

let sendVoiceMode: VoiceModeSender = () => {};

/** Wired from net/store so mic state reaches the relay for honest “talking” counts. */
export function setVoiceModeSender(fn: VoiceModeSender): void {
  sendVoiceMode = fn;
}

/**
 * Proximity voice: small WebRTC mesh, gated by distance.
 * Signaling rides the same relay / BroadcastChannel as game state.
 */
export class VoiceChat {
  on = false;
  muted = true;
  speakerMuted = false;
  error = "";
  linked = 0;
  speaking = 0;

  private stream: MediaStream | null = null;
  private listeners = new Set<() => void>();
  private readonly mesh = new VoiceMesh();

  setSender(selfId: string, send: SendFn): void {
    this.mesh.configure(selfId, send, () => this.emit());
  }

  setPositionalSink(sink: PositionalSink | null): void {
    this.mesh.setPositionalSink(sink);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.linked = this.mesh.links.size;
    for (const fn of this.listeners) fn();
  }

  ui(): VoiceUi {
    return { on: this.on, muted: this.muted, linked: this.linked, speaking: this.speaking, error: this.error };
  }

  setSpeakerMuted(muted: boolean): void {
    this.speakerMuted = muted;
    for (const link of this.mesh.links.values()) {
      if (muted) link.audio.volume = 0;
    }
    this.emit();
  }

  toggleSpeakerMuted(): boolean {
    this.setSpeakerMuted(!this.speakerMuted);
    return this.speakerMuted;
  }

  async enable(): Promise<void> {
    if (this.on) return;
    this.error = "";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.mesh.setStream(this.stream);
      this.on = true;
      this.muted = false;
      this.applyMute();
      sendVoiceMode(true);
      this.emit();
    } catch {
      this.error = "Mic permission denied";
      this.on = false;
      sendVoiceMode(false);
      this.emit();
    }
  }

  disable(): void {
    this.on = false;
    this.muted = true;
    this.error = "";
    this.mesh.hangupAll(true);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mesh.setStream(null);
    sendVoiceMode(false);
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMute();
    sendVoiceMode(this.on && !this.muted);
    this.emit();
  }

  toggleMute(): void {
    if (!this.on) void this.enable();
    else this.setMuted(!this.muted);
  }

  private applyMute(): void {
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = this.on && !this.muted;
    });
  }

  /** Call ~4–10 Hz from the game loop with peer positions. */
  tick(peers: { id: string; x: number; z: number; dist2?: number }[]): void {
    tickVoiceMesh(this.mesh, this.on, this.stream, this.speakerMuted, peers, this.speaking, (n) => {
      this.speaking = n;
      this.emit();
    });
  }

  handleSignal(msg: Wire): void {
    this.mesh.handleSignal(msg, this.on);
  }
}

export const voice = new VoiceChat();
