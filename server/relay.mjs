// India IRL relay. One room per city. The server never simulates anything: it
// validates, stamps the sender id, and fans messages out with spatial interest
// so a busy plaza does not flood players on the other side of the map.
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { MEET_CENTERS, nearestMeetId } from "./meet-centers.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM ?? 60);
const CITIES = new Set(["bengaluru", "pune", "hyderabad", "gurugram"]);
const ID_RE = /^[a-zA-Z0-9_-]{4,24}$/;
const PLAN_TTL_MS = 2 * 60 * 60 * 1000;

/** Full-rate fan-out inside this radius (meters). */
const NEAR = 90;
/** Mid-rate fan-out inside this radius. */
const MID = 200;
const NEAR2 = NEAR * NEAR;
const MID2 = MID * MID;
const MID_MS = 220;
const FAR_MS = 1100;

/** @type {Map<string, Set<import("ws").WebSocket & { meta?: any }>>} */
const rooms = new Map();
for (const c of CITIES) rooms.set(c, new Set());

/** @type {Map<string, { name: string, meet: string | null, at: number }[]>} */
const recentJoins = new Map();
for (const c of CITIES) recentJoins.set(c, []);

/** @type {Map<string, { id: string, city: string, meet: string, hostName: string, expiresAt: number, joined: string[] }>} */
const plans = new Map();

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
const num = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);

function pushJoin(city, name, meet) {
  const list = recentJoins.get(city);
  if (!list) return;
  list.unshift({ name, meet, at: Date.now() });
  if (list.length > 12) list.length = 12;
}

function cityStats(city) {
  const set = rooms.get(city);
  const centers = MEET_CENTERS[city] ?? [];
  /** @type {Record<string, { n: number, talking: number }>} */
  const meets = {};
  for (const m of centers) meets[m.id] = { n: 0, talking: 0 };
  let online = 0;
  let talking = 0;
  if (set) {
    for (const ws of set) {
      if (!ws.meta) continue;
      online += 1;
      if (ws.meta.micLive) talking += 1;
      const mid = ws.meta.meetId;
      if (mid && meets[mid]) {
        meets[mid].n += 1;
        if (ws.meta.micLive) meets[mid].talking += 1;
      }
    }
  }
  return {
    online,
    talking,
    meets,
    recentJoins: (recentJoins.get(city) ?? []).slice(0, 8),
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 4096) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

const http = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/stats") {
    const stats = {};
    for (const city of CITIES) stats[city] = cityStats(city);
    json(res, 200, stats);
    return;
  }

  if (url.pathname === "/plans" && req.method === "POST") {
    const body = await readBody(req);
    if (!body) return json(res, 400, { error: "bad json" });
    const city = String(body.city || "");
    const meet = clean(body.meet, 32);
    if (!CITIES.has(city) || !meet || !(MEET_CENTERS[city] || []).some((m) => m.id === meet)) {
      return json(res, 400, { error: "bad city/meet" });
    }
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const plan = {
      id,
      city,
      meet,
      hostName: clean(body.hostName, 16) || "Host",
      expiresAt: Date.now() + PLAN_TTL_MS,
      joined: [],
    };
    plans.set(id, plan);
    json(res, 200, { id: plan.id, expiresAt: plan.expiresAt, city, meet });
    return;
  }

  const planGet = url.pathname.match(/^\/plans\/([a-zA-Z0-9_-]{4,24})$/);
  if (planGet && req.method === "GET") {
    const plan = plans.get(planGet[1]);
    if (!plan) return json(res, 404, { error: "not found" });
    if (Date.now() > plan.expiresAt) return json(res, 410, { error: "expired", ...plan, expired: true });
    json(res, 200, plan);
    return;
  }

  const planJoin = url.pathname.match(/^\/plans\/([a-zA-Z0-9_-]{4,24})\/join$/);
  if (planJoin && req.method === "POST") {
    const plan = plans.get(planJoin[1]);
    if (!plan) return json(res, 404, { error: "not found" });
    if (Date.now() > plan.expiresAt) return json(res, 410, { error: "expired" });
    const body = await readBody(req);
    const name = clean(body?.name, 16);
    if (name && !plan.joined.includes(name) && plan.joined.length < 40) plan.joined.push(name);
    json(res, 200, plan);
    return;
  }

  res.statusCode = 200;
  res.end("india-irl relay ok\n");
});

const wss = new WebSocketServer({ server: http, maxPayload: 16384 });

function broadcast(room, from, payload) {
  const data = JSON.stringify(payload);
  for (const peer of room) {
    if (peer !== from && peer.readyState === 1) peer.send(data);
  }
}

/** Point-to-point for WebRTC voice signaling (offer / answer / ICE). */
function routeTo(room, from, toId, payload) {
  if (!ID_RE.test(toId)) return;
  for (const peer of room) {
    if (peer !== from && peer.meta?.id === toId && peer.readyState === 1) {
      peer.send(JSON.stringify(payload));
      return;
    }
  }
}

/**
 * Spatial interest: near peers get every state packet; mid peers are throttled;
 * far peers get a heartbeat so they stay on the minimap without eating bandwidth.
 */
function broadcastState(room, from, payload) {
  const data = JSON.stringify(payload);
  const fx = from.meta.x;
  const fz = from.meta.z;
  const now = Date.now();
  const fromId = from.meta.id;

  for (const peer of room) {
    if (peer === from || peer.readyState !== 1 || !peer.meta) continue;
    if (!Number.isFinite(peer.meta.x) || !Number.isFinite(fx)) {
      peer.send(data);
      continue;
    }
    const dx = peer.meta.x - fx;
    const dz = peer.meta.z - fz;
    const d2 = dx * dx + dz * dz;
    if (d2 <= NEAR2) {
      peer.send(data);
      continue;
    }
    if (!peer.meta.fwdAt) peer.meta.fwdAt = new Map();
    const last = peer.meta.fwdAt.get(fromId) ?? 0;
    const gap = d2 <= MID2 ? MID_MS : FAR_MS;
    if (now - last >= gap) {
      peer.meta.fwdAt.set(fromId, now);
      peer.send(data);
    }
  }
}

wss.on("connection", (ws) => {
  ws.meta = null;
  ws.tokens = 80;
  ws.lastChat = 0;
  const refill = setInterval(() => {
    ws.tokens = Math.min(80, ws.tokens + 50);
  }, 1000);

  ws.on("message", (raw) => {
    if (--ws.tokens < 0) return;
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== "string") return;

    if (msg.t === "join") {
      if (ws.meta) return;
      const city = String(msg.city);
      const room = rooms.get(city);
      if (!room || !ID_RE.test(String(msg.id)) || room.size >= MAX_PER_ROOM) {
        ws.close(1008, "rejected");
        return;
      }
      const look = Array.isArray(msg.look) ? msg.look.slice(0, 12).map((n) => num(Number(n), 0, 255)) : [];
      const name = clean(msg.name, 16) || "Guest";
      const hintMeet = clean(msg.meet, 32) || null;
      ws.meta = {
        id: String(msg.id),
        name,
        look,
        city,
        room,
        x: NaN,
        z: NaN,
        meetId: hintMeet && (MEET_CENTERS[city] || []).some((m) => m.id === hintMeet) ? hintMeet : null,
        micLive: false,
        fwdAt: new Map(),
      };
      const peers = [];
      for (const p of room) peers.push({ id: p.meta.id, name: p.meta.name, look: p.meta.look });
      room.add(ws);
      pushJoin(city, name, ws.meta.meetId);
      ws.send(JSON.stringify({ t: "welcome", peers }));
      broadcast(room, ws, { t: "join", id: ws.meta.id, name: ws.meta.name, look });
      return;
    }

    if (!ws.meta) return;
    const { id, room } = ws.meta;

    if (msg.t === "s" && Array.isArray(msg.p) && msg.p.length >= 8) {
      const p = msg.p;
      const x = num(p[0], -5000, 5000);
      const z = num(p[1], -5000, 5000);
      ws.meta.x = x;
      ws.meta.z = z;
      ws.meta.meetId = nearestMeetId(ws.meta.city, x, z);
      const ride = typeof p[7] === "string" && ID_RE.test(p[7]) ? p[7] : 0;
      broadcastState(room, ws, {
        t: "s",
        id,
        p: [
          x, z, num(p[2], -20, 20), num(p[3], -60, 60),
          num(p[4], 0, 3) | 0, num(p[5], 0, 5) | 0, num(p[6], 0, 6) | 0, ride,
        ],
      });
    } else if (msg.t === "hit") {
      const to = typeof msg.to === "string" && ID_RE.test(msg.to) ? msg.to : "";
      if (!to) return;
      const k = Number(msg.k) === 1 ? 1 : 0;
      const payload = JSON.stringify({ t: "hit", id, to, k });
      const fx = ws.meta.x;
      const fz = ws.meta.z;
      for (const peer of room) {
        if (peer === ws || peer.readyState !== 1 || !peer.meta) continue;
        if (peer.meta.id !== to) continue;
        if (Number.isFinite(peer.meta.x) && Number.isFinite(fx)) {
          const dx = peer.meta.x - fx;
          const dz = peer.meta.z - fz;
          if (dx * dx + dz * dz > 40 * 40) continue;
        }
        peer.send(payload);
        break;
      }
    } else if (msg.t === "vm") {
      ws.meta.micLive = !!msg.on;
      ws.tokens = Math.min(80, ws.tokens + 1);
    } else if (msg.t === "h") {
      const data = JSON.stringify({ t: "h", id });
      const fx = ws.meta.x;
      const fz = ws.meta.z;
      for (const peer of room) {
        if (peer === ws || peer.readyState !== 1 || !peer.meta) continue;
        if (!Number.isFinite(peer.meta.x) || !Number.isFinite(fx)) {
          peer.send(data);
          continue;
        }
        const dx = peer.meta.x - fx;
        const dz = peer.meta.z - fz;
        if (dx * dx + dz * dz <= MID2) peer.send(data);
      }
    } else if (msg.t === "chat") {
      const now = Date.now();
      if (now - ws.lastChat < 400) return;
      ws.lastChat = now;
      const m = clean(msg.m, 140);
      if (m) broadcast(room, ws, { t: "chat", id, m });
    } else if (msg.t === "tr" && Array.isArray(msg.p)) {
      const p = msg.p;
      if (p.length > 400) return;
      const out = [];
      for (let i = 0; i < p.length; i += 1) out.push(num(Number(p[i]), -5000, 5000));
      broadcast(room, ws, { t: "tr", id, p: out });
    } else if (msg.t === "vo" || msg.t === "va" || msg.t === "vi" || msg.t === "vx") {
      const to = String(msg.to ?? "");
      if (!ID_RE.test(to) || to === id) return;
      if (msg.t === "vi") {
        ws.tokens = Math.min(80, ws.tokens + 1);
        routeTo(room, ws, to, { t: "vi", id, to, candidate: msg.candidate ?? null });
      } else if (msg.t === "vx") {
        routeTo(room, ws, to, { t: "vx", id, to });
      } else {
        const sdp = typeof msg.sdp === "string" ? msg.sdp.slice(0, 12000) : "";
        if (!sdp) return;
        routeTo(room, ws, to, { t: msg.t, id, to, sdp });
      }
    }
  });

  ws.on("close", () => {
    clearInterval(refill);
    if (!ws.meta) return;
    ws.meta.room.delete(ws);
    broadcast(ws.meta.room, ws, { t: "leave", id: ws.meta.id });
  });
  ws.on("error", () => ws.close());
});

// Sweep expired plans occasionally.
setInterval(() => {
  const now = Date.now();
  for (const [id, p] of plans) if (now > p.expiresAt + 60_000) plans.delete(id);
}, 60_000);

http.listen(PORT, () => console.log(`india-irl relay listening on :${PORT}`));
