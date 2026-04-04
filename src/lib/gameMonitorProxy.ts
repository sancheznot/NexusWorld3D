/**
 * ES: Proxy desde Next hacia el HTTP interno del proceso Colyseus.
 * EN: Proxy from Next to Colyseus internal HTTP.
 */

const DEFAULT_URL = "http://127.0.0.1:3020";

export function getGameMonitorBaseUrl(): string {
  const u = process.env.NEXUS_GAME_MONITOR_URL?.trim();
  return u || DEFAULT_URL;
}

export function getGameMonitorSecret(): string {
  return process.env.NEXUS_GAME_MONITOR_SECRET?.trim() || "";
}

export function isGameMonitorConfigured(): boolean {
  return Boolean(getGameMonitorSecret());
}

export async function fetchGameMonitorSnapshot(): Promise<unknown | null> {
  const secret = getGameMonitorSecret();
  if (!secret) return null;
  const base = getGameMonitorBaseUrl().replace(/\/$/, "");
  const url = `${base}/__nexus-internal/v1/snapshot`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
