/**
 * Two transports behind one interface.
 *  - ws: a relay server (server/relay.mjs). Real multiplayer across machines.
 *  - local: BroadcastChannel. Zero setup, works across tabs of one browser,
 *    which is also how the world can be tried with no server running.
 */
export type Wire = { t: string } & Record<string, unknown>;

export type TransportKind = "ws" | "local";

export type TransportHandlers = {
  message: (msg: Wire, kind: TransportKind) => void;
  open: (kind: TransportKind) => void;
  close: () => void;
};

export type Transport = {
  send: (msg: Wire) => void;
  close: () => void;
};

export function relayUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_RELAY_URL;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.hostname}:8787`;
}

export function relayHttp(): string {
  return relayUrl().replace(/^ws/, "http");
}

export function openTransport(city: string, selfId: string, h: TransportHandlers): Transport {
  let ws: WebSocket | null = null;
  let channel: BroadcastChannel | null = null;
  let disposed = false;
  let everOpened = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let guard: ReturnType<typeof setTimeout> | null = null;
  let mode: TransportKind | null = null;

  const useLocal = () => {
    if (disposed || channel || typeof BroadcastChannel === "undefined") return;
    channel = new BroadcastChannel(`india-irl:${city}`);
    channel.onmessage = (ev: MessageEvent) => {
      const data = ev.data as { from?: string; msg?: Wire } | null;
      if (!data || data.from === selfId || !data.msg) return;
      h.message({ ...data.msg, id: data.from }, "local");
    };
    mode = "local";
    h.open("local");
  };

  const connectWs = () => {
    if (disposed) return;
    let sock: WebSocket;
    try {
      sock = new WebSocket(relayUrl());
    } catch {
      useLocal();
      return;
    }
    ws = sock;
    guard = setTimeout(() => {
      if (!everOpened && sock.readyState !== WebSocket.OPEN) {
        sock.onclose = null;
        sock.close();
        useLocal();
      }
    }, 2500);
    sock.onopen = () => {
      everOpened = true;
      mode = "ws";
      if (guard) clearTimeout(guard);
      h.open("ws");
    };
    sock.onmessage = (ev) => {
      try {
        h.message(JSON.parse(String(ev.data)) as Wire, "ws");
      } catch {
        /* ignore malformed frames */
      }
    };
    sock.onclose = () => {
      if (disposed) return;
      if (guard) clearTimeout(guard);
      h.close();
      if (!everOpened) useLocal();
      else retry = setTimeout(connectWs, 3000);
    };
    sock.onerror = () => sock.close();
  };

  connectWs();

  return {
    send(msg) {
      if (mode === "ws" && ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      else if (mode === "local" && channel) channel.postMessage({ from: selfId, msg });
    },
    close() {
      disposed = true;
      if (retry) clearTimeout(retry);
      if (guard) clearTimeout(guard);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      channel?.close();
    },
  };
}
