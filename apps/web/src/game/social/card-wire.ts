/** Business-card handshake over the existing relay transport. */
import type { BusinessCard } from "./card-store";
import type { Wire } from "@/net/transport";

export type CardOp = "req" | "offer" | "deny";

export type CardWire = {
  t: "card";
  to: string;
  op: CardOp;
  fields?: Partial<BusinessCard>;
};

export type CardInbox = {
  from: string;
  name: string;
  op: CardOp;
  fields?: Partial<BusinessCard>;
};

let sendFn: ((msg: Wire) => void) | null = null;
let inbox: CardInbox | null = null;
const listeners = new Set<() => void>();

export function setCardSender(fn: (msg: Wire) => void): void {
  sendFn = fn;
}

export function subscribeCard(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

export function takeCardInbox(): CardInbox | null {
  const v = inbox;
  inbox = null;
  return v;
}

export function peekCardInbox(): CardInbox | null {
  return inbox;
}

export function requestCard(to: string): void {
  sendFn?.({ t: "card", to, op: "req" });
}

export function offerCard(to: string, fields: Partial<BusinessCard>): void {
  sendFn?.({ t: "card", to, op: "offer", fields });
}

export function denyCard(to: string): void {
  sendFn?.({ t: "card", to, op: "deny" });
}

export function handleCardMessage(msg: Wire, from: string, name: string, selfId: string): void {
  if (msg.t !== "card") return;
  const to = typeof msg.to === "string" ? msg.to : "";
  if (to && to !== selfId) return;
  const op = msg.op === "offer" || msg.op === "deny" || msg.op === "req" ? msg.op : null;
  if (!op || !from) return;
  const fields =
    msg.fields && typeof msg.fields === "object" ? (msg.fields as Partial<BusinessCard>) : undefined;
  inbox = { from, name, op, fields };
  emit();
}
