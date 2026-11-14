"use client";

import type { CSSProperties } from "react";
import { loadCard, pickCardFields, type BusinessCard } from "@/game/social/card-store";
import { denyCard, offerCard, takeCardInbox, type CardInbox } from "@/game/social/card-wire";
import { toast } from "@/game/store";

const SHARE_KEYS: (keyof BusinessCard)[] = ["linkedin", "instagram", "whatsapp", "status"];

type Props = {
  inbox: CardInbox | null;
  onClear: () => void;
  onKeep: (fields: Partial<BusinessCard>) => void;
};

export function CardPrompts({ inbox, onClear, onKeep }: Props) {
  if (!inbox) return null;
  if (inbox.op === "req") {
    return (
      <div style={panelStyle}>
        <p>
          <strong>{inbox.name}</strong> wants your card
        </p>
        <button
          type="button"
          className="chip on"
          onClick={() => {
            const from = inbox.from;
            takeCardInbox();
            onClear();
            void loadCard().then((c) => {
              offerCard(from, pickCardFields(c, SHARE_KEYS));
              toast("Shared card");
            });
          }}
        >
          Share LinkedIn / IG / WA / status
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => {
            denyCard(inbox.from);
            takeCardInbox();
            onClear();
          }}
        >
          Deny
        </button>
      </div>
    );
  }
  if (inbox.op === "offer" && inbox.fields) {
    return (
      <div style={panelStyle}>
        <p>
          <strong>{inbox.name}</strong> shared:
        </p>
        <pre style={{ fontSize: 11 }}>{JSON.stringify(inbox.fields, null, 2)}</pre>
        <button
          type="button"
          className="chip on"
          onClick={() => {
            onKeep(inbox.fields ?? {});
            takeCardInbox();
            onClear();
          }}
        >
          Keep
        </button>
      </div>
    );
  }
  return null;
}

const panelStyle: CSSProperties = {
  position: "fixed",
  right: 12,
  bottom: 160,
  zIndex: 40,
  width: 260,
  padding: 12,
  background: "rgba(12,14,18,0.92)",
  borderRadius: 8,
  color: "#eee",
};
