"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ACCESSORIES,
  BODY_NAMES,
  BOTTOM_COLORS,
  BOTTOM_NAMES,
  DEFAULT_LOOK,
  HAIR_COLORS,
  HAIR_NAMES,
  SHOE_COLORS,
  SHOE_NAMES,
  SKIN_TONES,
  TOP_COLORS,
  TOP_NAMES,
  cleanName,
  lookKey,
  randomLook,
  type Look,
} from "@/avatar/appearance";
import { EMOTES, buildRig, poseRig } from "@/avatar/rig";
import { advanceStep, applyEndowment, loadOnboard } from "@/game/onboarding";
import { grantMission, loadProfile, saveProfile, useGame } from "@/game/store";
import {
  MISSIONS,
  levelInfo,
  loadVibe,
  missionsDone,
  noteLookTweak,
  noteSession,
  touchStreak,
  type VibeState,
} from "@/game/vibe";
import {
  createPlan,
  fetchPlan,
  fetchStats,
  honestHeadcount,
  joinPlan,
  type PlanInfo,
  type StatsMap,
} from "@/net/stats";
import { CITIES, CITY_IDS } from "@/world/cities";
import {
  buildShareUrl,
  identityCaption,
  parseDeepLink,
  whatsappShareText,
} from "@/world/meets";
import type { CityId } from "@/world/types";

const CITY_ART: Record<CityId, string> = {
  bengaluru: "linear-gradient(135deg, #2f6b3a 0%, #7ec8a0 55%, #e7c56a 100%)",
  pune: "linear-gradient(135deg, #8a3b2e 0%, #e8913c 60%, #f2d9a0 100%)",
  hyderabad: "linear-gradient(135deg, #3b2a5e 0%, #d9548a 60%, #f2c230 100%)",
  gurugram: "linear-gradient(135deg, #123a5c 0%, #3d86b8 60%, #b6d2ea 100%)",
};

function Preview({ look, emote }: { look: Look; emote: number }) {
  const rig = useMemo(() => buildRig(look), [look]);
  const group = useRef<THREE.Group>(null);
  const drag = useRef({ down: false, x: 0, vel: 0 });
  const started = useRef(performance.now());

  const key = lookKey(look);
  useEffect(() => {
    started.current = performance.now();
    // Face the camera so the cute face reads; slow idle spin after.
    if (group.current) group.current.rotation.y = 0.12;
    drag.current.vel = 0;
  }, [emote, key]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (!drag.current.down) g.rotation.y += drag.current.vel * delta;
    drag.current.vel += (0.045 - drag.current.vel) * Math.min(1, delta * 0.6);
    poseRig(
      rig,
      { phase: 0, speed: 0, emote, emoteT: (performance.now() - started.current) / 1000, seat: 0, time: state.clock.elapsedTime },
      delta,
    );
  });

  return (
    <group
      ref={group}
      onPointerDown={(e) => {
        drag.current.down = true;
        drag.current.x = e.clientX;
        (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current.down || !group.current) return;
        const dx = e.clientX - drag.current.x;
        drag.current.x = e.clientX;
        group.current.rotation.y += dx * 0.012;
        drag.current.vel = dx * 0.4;
      }}
      onPointerUp={() => {
        drag.current.down = false;
      }}
    >
      <primitive object={rig.root} />
      <mesh position={[0, 0.5, 0]} visible={false}>
        <boxGeometry args={[1.4, 2.2, 1.4]} />
      </mesh>
    </group>
  );
}

function StageGlow({ pulse }: { pulse: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    const m = mesh.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.22 + Math.sin(performance.now() * 0.003 + pulse) * 0.06;
    mesh.current.rotation.z += dt * 0.15;
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
      <ringGeometry args={[1.05, 1.32, 64]} />
      <meshBasicMaterial color="#e7c56a" transparent opacity={0.28} />
    </mesh>
  );
}

function PreviewCanvas({ look, emote, pulse }: { look: Look; emote: number; pulse: number }) {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{ fov: 28, position: [0, 1.22, 3.85], near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0.98, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <color attach="background" args={["#12180f"]} />
      <hemisphereLight args={["#fff2dc", "#3b4a52", 1.05]} />
      <directionalLight position={[3, 5, 4]} intensity={2.55} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 2, -3]} intensity={1.2} color="#8fc8ff" />
      <spotLight position={[0, 4.2, 1.5]} intensity={1.4} angle={0.55} penumbra={0.6} color="#f2c230" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.005, 0]}>
        <circleGeometry args={[1.35, 48]} />
        <meshStandardMaterial color="#1a2218" roughness={0.85} metalness={0.08} />
      </mesh>
      <StageGlow pulse={pulse} />
      <Preview look={look} emote={emote} />
    </Canvas>
  );
}

function Swatches({ colors, value, onPick }: { colors: readonly string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="swatches">
      {colors.map((c, i) => (
        <button key={c} className={i === value ? "sw on" : "sw"} style={{ background: c }} onClick={() => onPick(i)} aria-label={`Color ${i + 1}`} />
      ))}
    </div>
  );
}

function Chips({ names, value, onPick }: { names: readonly string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="chips">
      {names.map((n, i) => (
        <button key={n} className={i === value ? "chip on" : "chip"} onClick={() => onPick(i)}>
          {n}
        </button>
      ))}
    </div>
  );
}

const TABS = ["Body", "Hair", "Outfit", "Extras"] as const;

export default function Menu() {
  const look = useGame((s) => s.look);
  const name = useGame((s) => s.name);
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const setLook = useGame((s) => s.setLook);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Body");
  const [emote, setEmote] = useState(0);
  const [stats, setStats] = useState<StatsMap>({});
  const [vibe, setVibe] = useState<VibeState>(loadVibe);
  const [pulse, setPulse] = useState(0);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [localTitle, setLocalTitleUi] = useState("");
  const caption = identityCaption(lookKey(look));

  useEffect(() => {
    const saved = loadProfile();
    if (saved) useGame.setState({ name: saved.name, look: saved.look, cityId: saved.city });
    try {
      const deep = parseDeepLink(window.location.search);
      const patch: {
        cityId?: CityId;
        meetId?: string | null;
        joinId?: string | null;
        planId?: string | null;
      } = {};
      if (deep.city) patch.cityId = deep.city;
      if (deep.meet) patch.meetId = deep.meet;
      if (deep.join) patch.joinId = deep.join;
      if (deep.plan) patch.planId = deep.plan;
      if (Object.keys(patch).length) useGame.setState(patch);
      if (deep.plan) {
        void fetchPlan(deep.plan).then((p) => {
          if (!p) return;
          setPlan(p);
          if (!p.expired && deep.city) useGame.setState({ cityId: p.city, meetId: p.meet });
        });
      }
    } catch {
      /* ignore */
    }
    const award = touchStreak();
    const endowed = applyEndowment(award.state);
    setVibe(endowed?.vibe ?? award.state);
    useGame.setState({ vibe: endowed?.vibe ?? award.state });
    setLocalTitleUi(loadOnboard().localTitle);
    if (award.streakUp && award.state.streak > 1) {
      setFlash(`${award.state.streak}-day streak · keep it alive`);
    } else if (endowed && endowed.gained > 0) {
      setFlash(`Level bar primed · +${endowed.gained} vibe`);
    } else if (award.gained > 0) {
      setFlash(`Welcome back · +${award.gained} vibe`);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const tick = () =>
      fetchStats(ctl.signal).then((j) => {
        if (alive) setStats(j);
      });
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      ctl.abort();
      clearInterval(id);
    };
  }, []);

  // Poll plan membership when linked.
  useEffect(() => {
    const planId = useGame.getState().planId;
    if (!planId) return;
    const id = setInterval(() => {
      void fetchPlan(planId).then((p) => p && setPlan(p));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 3800);
    return () => clearTimeout(t);
  }, [flash]);

  const ready = cleanName(name).length > 0;
  const city = CITIES[cityId];
  const info = levelInfo(vibe.xp);
  const cityStat = stats[cityId];
  const meetStat = meetId && cityStat?.meets?.[meetId] ? cityStat.meets[meetId] : null;
  const here = meetStat ? meetStat.n : cityStat?.online ?? 0;
  const talking = meetStat ? meetStat.talking : cityStat?.talking ?? 0;
  const place = meetId ? city.meets.find((m) => m.id === meetId)?.label ?? city.name : city.name;
  const totalOnline = CITY_IDS.reduce((n, id) => n + (stats[id]?.online ?? 0), 0);
  const done = missionsDone(vibe);
  const joins = cityStat?.recentJoins ?? [];

  const tweak = (patch: Partial<Look>) => {
    setLook(patch);
    setPulse((p) => p + 1);
    setVibe(noteLookTweak());
  };

  const go = () => {
    const clean = cleanName(name);
    if (!clean) return;
    saveProfile(clean, look, cityId);
    noteSession(vibe);
    grantMission("enter");
    const board = loadOnboard();
    if (board.step === "customize") advanceStep("enter");
    const planId = useGame.getState().planId;
    if (planId) void joinPlan(planId, clean);
    useGame.setState({ name: clean, phase: "playing", vibe: loadVibe() });
  };

  const shareUrl = () =>
    buildShareUrl({
      origin: window.location.origin + "/",
      city: cityId,
      meet: meetId,
    });

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setFlash("Invite copied · drop it in the group chat");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setFlash("Copy failed — share the URL from the address bar");
    }
  };

  const shareWhatsApp = () => {
    const text = whatsappShareText({
      cityName: city.name,
      meetLabel: meetId ? place : null,
      here,
      talking,
      url: shareUrl(),
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const startPlan = async () => {
    if (!meetId) {
      setFlash("Pick a meet plaza first");
      return;
    }
    const host = cleanName(name) || "Host";
    const p = await createPlan(cityId, meetId, host);
    if (!p) {
      setFlash("Couldn’t start a plan — is the relay up?");
      return;
    }
    setPlan(p);
    useGame.setState({ planId: p.id });
    const url = buildShareUrl({ origin: window.location.origin + "/", city: cityId, meet: meetId, plan: p.id });
    try {
      await navigator.clipboard.writeText(url);
      setFlash("Plan link copied · expires in 2 hours");
    } catch {
      setFlash(`Plan ready: ${url}`);
    }
  };

  return (
    <main className="menu">
      <section className="menu-left">
        <header>
          <p className="live-pill">
            <span className="live-dot" />
            {honestHeadcount(meetId ? here : totalOnline, meetId ? talking : CITY_IDS.reduce((n, id) => n + (stats[id]?.talking ?? 0), 0), place)}
          </p>
          <h1>INDIA IRL</h1>
          <p className="hook-line">
            Walk into a room of people in your city. Right now.
          </p>
          {joins.length > 0 ? (
            <div className="join-ticker" aria-live="polite">
              {joins.slice(0, 3).map((j, i) => (
                <span key={`${j.name}-${j.at}-${i}`}>
                  {j.name} joined {j.meet ? city.meets.find((m) => m.id === j.meet)?.label ?? j.meet : city.name}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="vibe-card">
          <div className="vibe-top">
            <div>
              <strong>Lv {info.level}</strong>
              <span>{localTitle || info.title}</span>
            </div>
            <div className={`streak ${vibe.streak > 0 ? "on" : ""}`} title="Come back tomorrow to keep it">
              <em>{vibe.streak || 0}</em>
              <span>day streak</span>
            </div>
          </div>
          <div className="xp-bar" aria-hidden>
            <i style={{ width: `${Math.round(info.progress * 100)}%` }} />
          </div>
          <p className="xp-meta">
            {info.into}/{info.need} vibe to next title
            {vibe.bestStreak > vibe.streak ? ` · best ${vibe.bestStreak}` : ""}
          </p>
          <ul className="missions">
            {MISSIONS.map((m) => (
              <li key={m.id} className={vibe.missions[m.id] ? "done" : ""}>
                <span>{vibe.missions[m.id] ? "✓" : "○"}</span>
                {m.label}
                <em>+{m.xp}</em>
              </li>
            ))}
          </ul>
          <p className="mission-progress">{done}/5 today · clear the set before midnight IST</p>
        </div>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={16}
            placeholder="e.g. Aarav"
            onChange={(e) => useGame.setState({ name: e.target.value.replace(/[<>]/g, "") })}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </label>

        <div className="cities">
          {CITY_IDS.map((id) => {
            const c = CITIES[id];
            const n = stats[id]?.online ?? 0;
            const t = stats[id]?.talking ?? 0;
            return (
              <button key={id} className={id === cityId ? "city on" : "city"} onClick={() => useGame.setState({ cityId: id, meetId: null })}>
                <i style={{ background: CITY_ART[id] }} />
                <b>{c.name}</b>
                <span>{c.hubs.slice(0, 3).join(" · ")}</span>
                <em className={n > 0 ? "hot" : ""}>{n > 0 ? `${n} online${t > 0 ? ` · ${t} mic` : ""}` : "Be first"}</em>
              </button>
            );
          })}
        </div>
        <p className="blurb">
          {city.tagline} · <strong>{honestHeadcount(here, talking, place)}</strong>
        </p>

        <div className="meets">
          <span className="meets-label">Meet friends at</span>
          <div className="meet-row">
            <button type="button" className={!meetId ? "chip on" : "chip"} onClick={() => useGame.setState({ meetId: null })}>
              Default spawn
            </button>
            {city.meets.map((m) => {
              const ms = cityStat?.meets?.[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  className={meetId === m.id ? "chip on" : "chip"}
                  title={m.blurb}
                  onClick={() => useGame.setState({ meetId: m.id })}
                >
                  {m.label}
                  {ms && ms.n > 0 ? ` · ${ms.n}` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {plan ? (
          <p className="plan-status">
            Plan {plan.expired ? "expired" : "live"} · {plan.joined.length} joined
            {!plan.expired ? ` · ends ${new Date(plan.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
            {plan.joined.length ? ` · ${plan.joined.slice(0, 4).join(", ")}` : ""}
          </p>
        ) : null}

        <button className="play pulse" disabled={!ready} onClick={go}>
          {ready ? `Enter ${place} · +15 vibe` : "Name yourself to enter"}
        </button>
        <div className="invite-row">
          <button type="button" className="ghost" onClick={copyInvite}>
            {copied ? "Link copied" : "Copy invite"}
          </button>
          <button type="button" className="ghost" onClick={shareWhatsApp}>
            WhatsApp
          </button>
          <button type="button" className="ghost" onClick={startPlan}>
            Start a plan
          </button>
        </div>
        <p className="fine">Same city = same room. Counts are live from the relay — never faked.</p>
      </section>

      <section className="menu-stage">
        <PreviewCanvas look={look} emote={emote} pulse={pulse} />
        <div className="stage-badge">
          <span>Your look</span>
          <strong>{localTitle || info.title}</strong>
          <em className="identity-caption">{caption}</em>
        </div>
        <div className="emote-row">
          {EMOTES.map((e) => (
            <button key={e.id} className={emote === e.id ? "chip on" : "chip"} onClick={() => setEmote(e.id)}>
              {e.id === 0 ? "Idle" : e.name}
            </button>
          ))}
        </div>
      </section>

      <section className="menu-right">
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? "tab on" : "tab"} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>

        {tab === "Body" ? (
          <div className="group">
            <h3>Build</h3>
            <Chips names={BODY_NAMES} value={look.body} onPick={(i) => tweak({ body: i })} />
            <h3>Skin tone</h3>
            <Swatches colors={SKIN_TONES} value={look.skin} onPick={(i) => tweak({ skin: i })} />
            <p className="fine">People remember faces. Spend a minute here — it sticks.</p>
          </div>
        ) : null}

        {tab === "Hair" ? (
          <div className="group">
            <h3>Style</h3>
            <Chips names={HAIR_NAMES} value={look.hair} onPick={(i) => tweak({ hair: i })} />
            <h3>Color (also beard)</h3>
            <Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(i) => tweak({ hairColor: i })} />
          </div>
        ) : null}

        {tab === "Outfit" ? (
          <div className="group">
            <h3>Top</h3>
            <Chips names={TOP_NAMES} value={look.top} onPick={(i) => tweak({ top: i })} />
            <Swatches colors={TOP_COLORS} value={look.topColor} onPick={(i) => tweak({ topColor: i })} />
            <h3>Bottom</h3>
            <Chips names={BOTTOM_NAMES} value={look.bottom} onPick={(i) => tweak({ bottom: i })} />
            <Swatches colors={BOTTOM_COLORS} value={look.bottomColor} onPick={(i) => tweak({ bottomColor: i })} />
            <h3>Footwear</h3>
            <Chips names={SHOE_NAMES} value={look.shoe} onPick={(i) => tweak({ shoe: i })} />
            <Swatches colors={SHOE_COLORS} value={look.shoeColor} onPick={(i) => tweak({ shoeColor: i })} />
          </div>
        ) : null}

        {tab === "Extras" ? (
          <div className="group">
            <h3>Accessories</h3>
            <div className="chips">
              {ACCESSORIES.map((a) => (
                <button key={a.bit} className={look.acc & a.bit ? "chip on" : "chip"} onClick={() => tweak({ acc: look.acc ^ a.bit })}>
                  {a.name}
                </button>
              ))}
            </div>
            <p className="fine">Small details = recognition. Recognition = why friends stay.</p>
          </div>
        ) : null}

        <div className="menu-actions">
          <button
            className="ghost"
            onClick={() => {
              useGame.setState({ look: randomLook() });
              setPulse((p) => p + 1);
              setVibe(noteLookTweak());
              setFlash("Random drip — keep or tweak");
            }}
          >
            Surprise me
          </button>
          <button className="ghost" onClick={() => useGame.setState({ look: DEFAULT_LOOK })}>
            Reset
          </button>
        </div>
      </section>

      {flash ? <div className="menu-flash">{flash}</div> : null}
    </main>
  );
}
