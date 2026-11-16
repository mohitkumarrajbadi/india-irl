/**
 * Build RTCIceServer list: always STUN, optional TURN from env strings.
 * Set NEXT_PUBLIC_TURN_URLS (comma-separated), TURN_USERNAME, TURN_CREDENTIAL.
 */

const DEFAULT_STUN: RTCIceServer = { urls: "stun:stun.l.google.com:19302" };

export type IceEnv = {
  turnUrls?: string | null;
  turnUsername?: string | null;
  turnCredential?: string | null;
};

export function buildIceServers(env: IceEnv = {}): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ ...DEFAULT_STUN }];
  const raw = (env.turnUrls ?? "").trim();
  if (!raw) return servers;

  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return servers;

  const turn: RTCIceServer = { urls: urls.length === 1 ? urls[0]! : urls };
  const user = (env.turnUsername ?? "").trim();
  const cred = (env.turnCredential ?? "").trim();
  if (user && cred) {
    turn.username = user;
    turn.credential = cred;
  }
  servers.push(turn);
  return servers;
}

/** Browser helper — reads public env at call time. */
export function iceServersFromProcessEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): RTCIceServer[] {
  return buildIceServers({
    turnUrls: env.NEXT_PUBLIC_TURN_URLS,
    turnUsername: env.NEXT_PUBLIC_TURN_USERNAME,
    turnCredential: env.NEXT_PUBLIC_TURN_CREDENTIAL,
  });
}
