// OMMO / India IRL relay. Rooms: one per city + optional shared `ommo` world room.
// The server never simulates: it validates, stamps sender id, and fans out with
// spatial interest so a busy plaza does not flood distant players.
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { MEET_CENTERS, nearestMeetId, resolveCityId, resolveMeetId, worldMeetCenters } from "./meet-centers.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM ?? 60);
/** City rooms + shared world room (`ommo`) for worldV1 clients. */
const CITIES = new Set(["novapura", "mandipura", "neerabad", "udyogabad", "ommo"]);
const ID_RE = /^[a-zA-Z0-9_-]{4,24}$/;
const PLAN_TTL_MS = 2 * 60 * 60 * 1000;
/** Pose clamp — wide enough for one continuous world atlas. */
const POS_LO = -80_000;
const POS_HI = 80_000;

/** Full-rate fan-out (m). Keep in sync with @india-irl/network INTEREST_*. */
const NEAR = 90;
const MID = 200;
/** Highway-friendly far heartbeat for the shared world room. */
const MID_WORLD = 400;
const NEAR2 = NEAR * NEAR;
const MID2 = MID * MID;
const MID_WORLD2 = MID_WORLD * MID_WORLD;
const MID_MS = 220;
const FAR_MS = 1100;
const FAR_WORLD_MS = 800;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function log(level, msg, extra) {
  const line = { ts: new Date().toISOString(), level, msg, ...extra };
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(line));
}

function originAllowed(origin) {
  if (ALLOWED_ORIGINS.length === 0) return true;
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o));
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && originAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

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

function meetCentersFor(city) {
  if (city === "ommo") return worldMeetCenters();
  return MEET_CENTERS[city] ?? [];
}

function cityStats(city) {
  const set = rooms.get(city);
  const centers = meetCentersFor(city);
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
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (ALLOWED_ORIGINS.length > 0) {
    const origin = req.headers.origin;
    if (origin && !originAllowed(origin)) {
      return json(res, 403, { error: "origin not allowed" });
    }
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/health") {
    let sockets = 0;
    for (const set of rooms.values()) sockets += set.size;
    json(res, 200, { ok: true, uptime: process.uptime(), rooms: [...rooms.keys()], sockets });
    return;
  }

  if (url.pathname === "/stats") {
    const stats = {};
    for (const city of CITIES) stats[city] = cityStats(city);
    json(res, 200, stats);
    return;
  }

  if (url.pathname === "/plans" && req.method === "POST") {
    const body = await readBody(req);
    if (!body) return json(res, 400, { error: "bad json" });
    const city = resolveCityId(body.city) || (body.city === "ommo" ? "ommo" : null);
    const meet = resolveMeetId(city === "ommo" ? clean(body.destCity, 32) || "novapura" : city, clean(body.meet, 32));
    const planCity = city === "ommo" ? "ommo" : city;
    if (!planCity || !meet) return json(res, 400, { error: "bad city/meet" });
    if (planCity !== "ommo" && !(MEET_CENTERS[planCity] || []).some((m) => m.id === meet)) {
      return json(res, 400, { error: "bad city/meet" });
    }
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const plan = {
      id,
      city: planCity,
      meet,
      hostName: clean(body.hostName, 16) || "Host",
      expiresAt: Date.now() + PLAN_TTL_MS,
      joined: [],
    };
    plans.set(id, plan);
    json(res, 200, { id: plan.id, expiresAt: plan.expiresAt, city: planCity, meet });
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
  res.setHeader("Content-Type", "text/plain");
  res.end("ommo relay ok\n");
});

const wss = new WebSocketServer({
  server: http,
  maxPayload: 16384,
  verifyClient(info, done) {
    if (ALLOWED_ORIGINS.length === 0) return done(true);
    const origin = info.origin || "";
    if (originAllowed(origin)) return done(true);
    log("warn", "ws_origin_rejected", { origin });
    done(false, 403, "origin not allowed");
  },
});

function broadcast(room, from, payload) {
  const data = JSON.stringify(payload);
  for (const peer of room) {
    if (peer !== from && peer.readyState === 1) peer.send(data);
  }
}

function routeTo(room, from, toId, payload) {
  if (!ID_RE.test(toId)) return;
  for (const peer of room) {
    if (peer !== from && peer.meta?.id === toId && peer.readyState === 1) {
      peer.send(JSON.stringify(payload));
      return;
    }
  }
}

function broadcastState(room, from, payload) {
  const data = JSON.stringify(payload);
  const fx = from.meta.x;
  const fz = from.meta.z;
  const now = Date.now();
  const fromId = from.meta.id;
  const world = from.meta.city === "ommo";
  const mid2 = world ? MID_WORLD2 : MID2;
  const farMs = world ? FAR_WORLD_MS : FAR_MS;

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
    const gap = d2 <= mid2 ? MID_MS : farMs;
    if (now - last >= gap) {
      peer.meta.fwdAt.set(fromId, now);
      peer.send(data);
    }
  }
}

function resolveJoinCity(raw) {
  if (raw === "ommo") return "ommo";
  return resolveCityId(raw);
}

wss.on("connection", (ws, req) => {
  ws.meta = null;
  ws.tokens = 80;
  ws.lastChat = 0;
  log("info", "ws_open", { ip: req.socket.remoteAddress });
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
      const city = resolveJoinCity(msg.city);
      const room = city ? rooms.get(city) : null;
      if (!city || !room || !ID_RE.test(String(msg.id)) || room.size >= MAX_PER_ROOM) {
        ws.close(1008, "rejected");
        return;
      }
      const look = Array.isArray(msg.look) ? msg.look.slice(0, 12).map((n) => num(Number(n), 0, 255)) : [];
      const name = clean(msg.name, 16) || "Guest";
      const destCity = resolveCityId(msg.destCity) || (city === "ommo" ? "novapura" : city);
      const hintMeet = resolveMeetId(destCity, clean(msg.meet, 32));
      const centers = meetCentersFor(city);
      ws.meta = {
        id: String(msg.id),
        name,
        look,
        city,
        destCity,
        room,
        x: NaN,
        z: NaN,
        meetId: hintMeet && centers.some((m) => m.id === hintMeet) ? hintMeet : null,
        micLive: false,
        fwdAt: new Map(),
      };
      const peers = [];
      for (const p of room) peers.push({ id: p.meta.id, name: p.meta.name, look: p.meta.look });
      room.add(ws);
      pushJoin(city, name, ws.meta.meetId);
      log("info", "join", { id: ws.meta.id, city, name, peers: room.size });
      ws.send(JSON.stringify({ t: "welcome", peers }));
      broadcast(room, ws, { t: "join", id: ws.meta.id, name: ws.meta.name, look });
      return;
    }

    if (!ws.meta) return;
    const { id, room } = ws.meta;

    if (msg.t === "s" && Array.isArray(msg.p) && msg.p.length >= 8) {
      const p = msg.p;
      const x = num(p[0], POS_LO, POS_HI);
      const z = num(p[1], POS_LO, POS_HI);
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
    } else if (msg.t === "sb" && typeof msg.b === "string" && msg.b.length >= 16 && msg.b.length <= 128) {
      try {
        const buf = Buffer.from(msg.b, "base64");
        if (buf.length >= 12 && buf[0] === 1) {
          const x = buf.readFloatLE(4);
          const z = buf.readFloatLE(8);
          if (Number.isFinite(x) && Number.isFinite(z)) {
            ws.meta.x = Math.min(POS_HI, Math.max(POS_LO, x));
            ws.meta.z = Math.min(POS_HI, Math.max(POS_LO, z));
            ws.meta.meetId = nearestMeetId(ws.meta.city, ws.meta.x, ws.meta.z);
          }
        }
      } catch {
        /* ignore bad base64 */
      }
      broadcastState(room, ws, { t: "sb", id, b: msg.b });
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
    } else if (msg.t === "card") {
      const to = typeof msg.to === "string" && ID_RE.test(msg.to) ? msg.to : "";
      if (!to) return;
      const op = msg.op === "req" || msg.op === "offer" || msg.op === "deny" ? msg.op : null;
      if (!op) return;
      const fields =
        op === "offer" && msg.fields && typeof msg.fields === "object"
          ? {
              linkedin: clean(msg.fields.linkedin, 120),
              instagram: clean(msg.fields.instagram, 80),
              whatsapp: clean(msg.fields.whatsapp, 32),
              snapchat: clean(msg.fields.snapchat, 80),
              status: clean(msg.fields.status, 140),
            }
          : undefined;
      const payload = JSON.stringify({ t: "card", id, to, op, fields });
      const fx = ws.meta.x;
      const fz = ws.meta.z;
      for (const peer of room) {
        if (peer === ws || peer.readyState !== 1 || !peer.meta) continue;
        if (peer.meta.id !== to) continue;
        if (Number.isFinite(peer.meta.x) && Number.isFinite(fx)) {
          const dx = peer.meta.x - fx;
          const dz = peer.meta.z - fz;
          if (dx * dx + dz * dz > 48 * 48) continue;
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
      for (let i = 0; i < p.length; i += 1) out.push(num(Number(p[i]), POS_LO, POS_HI));
      broadcast(room, ws, { t: "tr", id, p: out });
    } else if (msg.t === "cl") {
      const k = msg.k === "t" ? "t" : msg.k === "p" ? "p" : null;
      const i = Math.floor(num(Number(msg.i), 0, 50000));
      if (!k) return;
      broadcast(room, ws, { t: "cl", id, k, i, free: Number(msg.free) === 1 ? 1 : 0 });
    } else if (msg.t === "db") {
      const s = msg.s === "st" || msg.s === "ex" || msg.s === "lp" || msg.s === "tr" ? msg.s : null;
      const i = Math.floor(num(Number(msg.i), 0, 50000));
      if (!s) return;
      broadcast(room, ws, { t: "db", id, s, i, free: Number(msg.free) === 1 ? 1 : 0 });
    } else if (msg.t === "cv") {
      const op = ["invite", "join", "leave", "regroup", "marker"].includes(String(msg.op)) ? String(msg.op) : null;
      if (!op) return;
      const to = typeof msg.to === "string" && ID_RE.test(msg.to) ? msg.to : undefined;
      const payload = {
        t: "cv",
        id,
        op,
        to,
        x: num(Number(msg.x), POS_LO, POS_HI),
        z: num(Number(msg.z), POS_LO, POS_HI),
        label: clean(msg.label, 32),
      };
      if (to && (op === "invite" || op === "join" || op === "marker")) routeTo(room, ws, to, payload);
      else broadcast(room, ws, payload);
    } else if (msg.t === "ap") {
      const op = ["invite", "join", "leave"].includes(String(msg.op)) ? String(msg.op) : null;
      const apt = clean(msg.apt, 32);
      if (!op || !apt) return;
      const to = typeof msg.to === "string" && ID_RE.test(msg.to) ? msg.to : undefined;
      const payload = { t: "ap", id, op, apt, to };
      if (to && (op === "invite" || op === "join")) routeTo(room, ws, to, payload);
      else broadcast(room, ws, payload);
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
    log("info", "leave", { id: ws.meta.id, city: ws.meta.city });
    broadcast(ws.meta.room, ws, { t: "leave", id: ws.meta.id });
  });
  ws.on("error", () => ws.close());
});

setInterval(() => {
  const now = Date.now();
  for (const [id, p] of plans) if (now > p.expiresAt + 60_000) plans.delete(id);
}, 60_000);

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", "shutdown", { signal });
  wss.close();
  http.close(() => {
    log("info", "closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const HOST = process.env.HOST || "0.0.0.0";
http.listen(PORT, HOST, () =>
  log("info", "listening", { host: HOST, port: PORT, origins: ALLOWED_ORIGINS.length || "any" }),
);
