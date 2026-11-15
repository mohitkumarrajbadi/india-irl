"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useGame } from "@/game/store";
import { sendChat } from "@/net/store";

export function ChatInput() {
  const ref = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = performance.now();
    ref.current?.focus();
  }, []);

  const close = () => useGame.setState({ chatOpen: false });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (performance.now() - openedAt.current < 250) return;
    const text = ref.current?.value ?? "";
    if (text.trim()) sendChat(text);
    close();
  };

  return (
    <form onSubmit={submit} className="chat-form">
      <input
        ref={ref}
        maxLength={140}
        placeholder="Say something nearby… (Enter to send, Esc to cancel)"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") close();
        }}
        onBlur={close}
        autoComplete="off"
      />
    </form>
  );
}
