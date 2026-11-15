/** Proximity voice constants + UI types. */

/** Hear / link only within this radius (meters). */
export const VOICE_RANGE = 28;
export const VOICE_RANGE2 = VOICE_RANGE * VOICE_RANGE;
/** Hard cap on simultaneous peer connections. */
export const VOICE_MAX_LINKS = 6;

export const ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type VoiceUi = {
  on: boolean;
  muted: boolean;
  linked: number;
  speaking: number;
  error: string;
};

export type VoiceModeSender = (on: boolean) => void;

export type SendFn = (msg: import("./transport").Wire) => void;

export type Link = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
};

/** Optional 3D sink (Phase E). When set, HTML element volume stays 0. */
export type PositionalSink = {
  onGain: (peerId: string, x: number, z: number, gain: number, stream: MediaStream | null) => void;
  onDrop: (peerId: string) => void;
};
