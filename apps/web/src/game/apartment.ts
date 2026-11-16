/**
 * Apartment session — enter/leave interior + invite peers.
 * Wire: { t: "ap", op: "invite"|"join"|"leave", apt, to? }
 */
import type { Apartment } from "@/world/apartments";
import { apartmentsFromCity, nearestApartment } from "@/world/apartments";
import type { CityData } from "@/world/types";

export type ApartmentSession = {
  apt: Apartment;
  /** Door pose to restore on leave. */
  doorX: number;
  doorZ: number;
  doorYaw: number;
};

let session: ApartmentSession | null = null;
let cache: Apartment[] = [];
let cacheCity: CityData | null = null;
let pendingInvite: { from: string; aptId: string } | null = null;

type Sender = ((msg: { t: string } & Record<string, unknown>) => void) | null;
let sendRaw: Sender = null;
let selfId = "";

export function setApartmentSender(fn: Sender, id: string): void {
  sendRaw = fn;
  selfId = id;
}

export function apartmentList(city: CityData): Apartment[] {
  if (cacheCity !== city) {
    cacheCity = city;
    cache = apartmentsFromCity(city);
  }
  return cache;
}

export function apartmentSession(): ApartmentSession | null {
  return session;
}

export function apartmentInside(): boolean {
  return session != null;
}

export function apartmentTryEnter(city: CityData, x: number, z: number, yaw: number): Apartment | null {
  if (session) return session.apt;
  const a = nearestApartment(x, z, apartmentList(city));
  if (!a) return null;
  session = { apt: a, doorX: x, doorZ: z, doorYaw: yaw };
  pendingInvite = null;
  return a;
}

export function apartmentEnterById(city: CityData, aptId: string, fromDoor = false): Apartment | null {
  const a = apartmentList(city).find((p) => p.id === aptId);
  if (!a) return null;
  session = {
    apt: a,
    doorX: fromDoor ? a.x + Math.cos(a.yaw) * 2.2 : a.x,
    doorZ: fromDoor ? a.z - Math.sin(a.yaw) * 2.2 : a.z,
    doorYaw: a.yaw,
  };
  pendingInvite = null;
  return a;
}

export function apartmentLeave(): ApartmentSession | null {
  const prev = session;
  if (prev) sendRaw?.({ t: "ap", op: "leave", apt: prev.apt.id });
  session = null;
  return prev;
}

export function apartmentInvite(peerId: string): string {
  if (!session) return "Enter a flat first";
  if (!peerId || peerId === selfId) return "No one nearby";
  sendRaw?.({ t: "ap", op: "invite", apt: session.apt.id, to: peerId });
  return "Flat invite sent";
}

export function apartmentPending(): { from: string; aptId: string } | null {
  return pendingInvite;
}

export function applyApartmentMessage(
  msg: Record<string, unknown>,
  fromId: string,
): string | null {
  const op = msg.op;
  const apt = typeof msg.apt === "string" ? msg.apt : "";
  if (op === "invite") {
    const to = typeof msg.to === "string" ? msg.to : "";
    if (to !== selfId || !apt) return null;
    pendingInvite = { from: fromId, aptId: apt };
    return "Flat invite · press E near any door to accept, or E here";
  }
  if (op === "join") {
    if (!session || session.apt.id !== apt) return null;
    return "Peer arrived at your flat";
  }
  if (op === "leave") return null;
  return null;
}

export function apartmentAcceptInvite(city: CityData): Apartment | null {
  if (!pendingInvite) return null;
  const a = apartmentEnterById(city, pendingInvite.aptId);
  if (a) sendRaw?.({ t: "ap", op: "join", apt: a.id, to: pendingInvite.from });
  pendingInvite = null;
  return a;
}

/** Clamp foot pose inside interior footprint. */
export function apartmentClamp(x: number, z: number): { x: number; z: number } {
  if (!session) return { x, z };
  const { apt } = session;
  const h = apt.half;
  return {
    x: Math.max(apt.x - h, Math.min(apt.x + h, x)),
    z: Math.max(apt.z - h, Math.min(apt.z + h, z)),
  };
}

export function resetApartment(): void {
  session = null;
  pendingInvite = null;
  cache = [];
  cacheCity = null;
}
