"use client";

/**
 * Phase E: edit local business card + respond to share requests.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { live } from "@/game/runtime";
import {
  emptyCard,
  loadCard,
  saveCard,
  type BusinessCard,
} from "@/game/social/card-store";
import { peekCardInbox, requestCard, subscribeCard, type CardInbox } from "@/game/social/card-wire";
import { isSocialV2Enabled } from "@/game/sim/flags";
import { toast } from "@/game/store";
import { useNet } from "@/net/store";
import { CardPrompts } from "./CardPrompts";

export function BusinessCardPanel() {
  const on = typeof window !== "undefined" && isSocialV2Enabled();
  const [card, setCard] = useState<BusinessCard>(emptyCard);
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<CardInbox | null>(null);
  const [received, setReceived] = useState<Partial<BusinessCard> | null>(null);

  useEffect(() => {
    if (!on) return;
    void loadCard().then(setCard);
    return subscribeCard(() => setInbox(peekCardInbox()));
  }, [on]);

  if (!on) return null;

  return (
    <>
      <button type="button" className="chip" style={btn(72)} onClick={() => setOpen((v) => !v)}>
        Card
      </button>
      <button
        type="button"
        className="chip"
        style={btn(108)}
        onClick={() => {
          const near = nearestPeerId();
          if (!near) {
            toast("No one nearby to ask");
            return;
          }
          requestCard(near);
          toast("Card request sent");
        }}
      >
        Ask card
      </button>
      {open && (
        <div style={editorStyle}>
          <strong>Business card</strong>
          <p style={{ opacity: 0.7, fontSize: 12 }}>Stored on this device only.</p>
          {(Object.keys(emptyCard()) as (keyof BusinessCard)[]).map((k) => (
            <label key={k} style={{ display: "block", fontSize: 12, marginTop: 6 }}>
              {k}
              <input
                value={card[k]}
                onChange={(e) => setCard({ ...card, [k]: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
          ))}
          <button
            type="button"
            className="chip on"
            style={{ marginTop: 8 }}
            onClick={() => void saveCard(card).then(() => toast("Card saved locally"))}
          >
            Save
          </button>
          {received && <pre style={{ fontSize: 11, marginTop: 8 }}>{JSON.stringify(received, null, 2)}</pre>}
        </div>
      )}
      <CardPrompts
        inbox={inbox}
        onClear={() => setInbox(null)}
        onKeep={(fields) => {
          setReceived(fields);
          setOpen(true);
        }}
      />
    </>
  );
}

function nearestPeerId(): string | null {
  const { peerMap } = useNet.getState();
  let best: string | null = null;
  let bd = 12 * 12;
  peerMap.forEach((p) => {
    if (p.snaps.length === 0) return;
    const x = p.rx || p.snaps[p.snaps.length - 1].x;
    const z = p.rz || p.snaps[p.snaps.length - 1].z;
    const d = (x - live.x) ** 2 + (z - live.z) ** 2;
    if (d < bd) {
      bd = d;
      best = p.id;
    }
  });
  return best;
}

const btn = (bottom: number): CSSProperties => ({
  position: "fixed",
  right: 12,
  bottom,
  zIndex: 40,
});

const editorStyle: CSSProperties = {
  position: "fixed",
  right: 12,
  bottom: 148,
  zIndex: 40,
  width: 260,
  padding: 12,
  background: "rgba(12,14,18,0.92)",
  borderRadius: 8,
  color: "#eee",
};
