import type { Metadata } from "next";
import { CITIES } from "@/world/cities";
import { isCityId, parseDeepLink } from "@/world/meets";
import HomeClient from "./HomeClient";

function relayHttpServer(): string {
  if (process.env.RELAY_HTTP_URL) return process.env.RELAY_HTTP_URL;
  const ws = process.env.NEXT_PUBLIC_RELAY_URL;
  if (ws) return ws.replace(/^ws/, "http");
  return "http://127.0.0.1:8787";
}

async function liveLine(city: string, meet: string | null): Promise<string | null> {
  try {
    const r = await fetch(`${relayHttpServer()}/stats`, { next: { revalidate: 15 } });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    const raw = j[city];
    if (!raw || typeof raw !== "object") return null;
    const v = raw as { online?: number; talking?: number; meets?: Record<string, { n?: number; talking?: number }> };
    if (meet && v.meets?.[meet]) {
      const m = v.meets[meet];
      const n = Number(m.n) | 0;
      const t = Number(m.talking) | 0;
      if (n <= 0) return null;
      return t > 0 ? `${n} here now · ${t} talking` : `${n} here now`;
    }
    const n = Number(v.online) | 0;
    const t = Number(v.talking) | 0;
    if (n <= 0) return null;
    return t > 0 ? `${n} online · ${t} talking` : `${n} online`;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await props.searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v) && v[0]) q.set(k, v[0]);
  }
  const deep = parseDeepLink(q);
  const cityId = deep.city && isCityId(deep.city) ? deep.city : null;
  const city = cityId ? CITIES[cityId] : null;
  const meetLabel =
    city && deep.meet ? city.meets.find((m) => m.id === deep.meet)?.label ?? null : null;

  const where = meetLabel && city ? `${meetLabel}, ${city.name}` : city?.name ?? "India's IT cities";
  const live = cityId ? await liveLine(cityId, deep.meet) : null;

  const title = city ? `India IRL · ${where}` : "India IRL";
  const description = live
    ? `Walk into ${where}. ${live}. No install.`
    : `Walk into a room of people in ${where}. Browser hangout — no install.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function HomePage() {
  return <HomeClient />;
}
