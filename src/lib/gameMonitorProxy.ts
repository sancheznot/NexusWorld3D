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

export type SceneApplyMonitorResult =
  | { ok: true; roomId: string; worldId: string; entityCount: number }
  | { ok: false; error: string; status: number };

/**
 * ES: POST al monitor Colyseus (mismo secreto que snapshot). Solo servidor Next.
 * EN: POST to Colyseus internal monitor (same secret as snapshot). Next server only.
 */
export async function postGameMonitorSceneApplyV0_1(body: {
  roomId?: string;
  document: unknown;
}): Promise<SceneApplyMonitorResult> {
  const secret = getGameMonitorSecret();
  if (!secret) {
    return { ok: false, error: "monitor_not_configured", status: 503 };
  }
  const base = getGameMonitorBaseUrl().replace(/\/$/, "");
  const url = `${base}/__nexus-internal/v1/scene-apply-v0_1`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      roomId?: string;
      worldId?: string;
      entityCount?: number;
    };
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        error: typeof json.error === "string" ? json.error : `http_${res.status}`,
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
      };
    }
    if (
      typeof json.roomId === "string" &&
      typeof json.worldId === "string" &&
      typeof json.entityCount === "number"
    ) {
      return {
        ok: true,
        roomId: json.roomId,
        worldId: json.worldId,
        entityCount: json.entityCount,
      };
    }
    return { ok: false, error: "invalid_monitor_response", status: 502 };
  } catch {
    return { ok: false, error: "network_error", status: 502 };
  }
}

export type SceneStateMonitorResult =
  | { ok: true; roomId: string; document: unknown | null }
  | { ok: false; error: string; status: number };

export async function fetchGameMonitorSceneStateV0_1(roomId?: string): Promise<SceneStateMonitorResult> {
  const secret = getGameMonitorSecret();
  if (!secret) {
    return { ok: false, error: "monitor_not_configured", status: 503 };
  }
  const base = getGameMonitorBaseUrl().replace(/\/$/, "");
  const q = roomId?.trim() ? `?roomId=${encodeURIComponent(roomId.trim())}` : "";
  const url = `${base}/__nexus-internal/v1/scene-state-v0_1${q}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      roomId?: string;
      document?: unknown | null;
    };
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        error: typeof json.error === "string" ? json.error : `http_${res.status}`,
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
      };
    }
    if (typeof json.roomId === "string") {
      return { ok: true, roomId: json.roomId, document: json.document ?? null };
    }
    return { ok: false, error: "invalid_monitor_response", status: 502 };
  } catch {
    return { ok: false, error: "network_error", status: 502 };
  }
}

export async function postGameMonitorSceneMergeEntitiesV0_1(body: {
  roomId?: string;
  entities: unknown[];
}): Promise<SceneApplyMonitorResult> {
  const secret = getGameMonitorSecret();
  if (!secret) {
    return { ok: false, error: "monitor_not_configured", status: 503 };
  }
  const base = getGameMonitorBaseUrl().replace(/\/$/, "");
  const url = `${base}/__nexus-internal/v1/scene-merge-entities-v0_1`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      roomId?: string;
      worldId?: string;
      entityCount?: number;
    };
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        error: typeof json.error === "string" ? json.error : `http_${res.status}`,
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
      };
    }
    if (
      typeof json.roomId === "string" &&
      typeof json.worldId === "string" &&
      typeof json.entityCount === "number"
    ) {
      return {
        ok: true,
        roomId: json.roomId,
        worldId: json.worldId,
        entityCount: json.entityCount,
      };
    }
    return { ok: false, error: "invalid_monitor_response", status: 502 };
  } catch {
    return { ok: false, error: "network_error", status: 502 };
  }
}
