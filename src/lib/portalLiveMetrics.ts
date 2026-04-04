/**
 * ES: Métricas públicas derivadas del snapshot interno de Colyseus (sin exponer logs ni IDs sensibles).
 * EN: Public metrics from Colyseus internal snapshot (no logs or sensitive IDs).
 */

import type { PublicPortalRoom } from "@/types/gamePortal.types";

export type PortalLiveApplyResult = {
  rooms: PublicPortalRoom[];
  totalOnline: number | null;
  live: boolean;
};

function sumClientsByRoomName(snapshot: Record<string, unknown>): Map<string, number> {
  const map = new Map<string, number>();
  const raw = snapshot.rooms;
  if (!Array.isArray(raw)) return map;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const name = (row as { name?: unknown }).name;
    const clients = (row as { clients?: unknown }).clients;
    if (typeof name !== "string" || !name) continue;
    const n = typeof clients === "number" && Number.isFinite(clients) ? clients : 0;
    map.set(name, (map.get(name) ?? 0) + n);
  }
  return map;
}

/**
 * ES: Aplica CCU y jugadores por nombre de sala Colyseus al listado del portal.
 * EN: Applies CCU and per–room-name client counts to the portal list.
 */
export function applyLiveMetricsToPortalRooms(
  rooms: PublicPortalRoom[],
  snapshot: unknown | null
): PortalLiveApplyResult {
  if (snapshot === null || typeof snapshot !== "object") {
    return {
      rooms: rooms.map((r) => ({ ...r })),
      totalOnline: null,
      live: false,
    };
  }

  const s = snapshot as Record<string, unknown>;
  const stats = s.stats;
  let totalOnline: number | null = null;
  if (stats && typeof stats === "object") {
    const ccu = (stats as { ccu?: unknown }).ccu;
    if (typeof ccu === "number" && Number.isFinite(ccu)) totalOnline = ccu;
  }

  const byName = sumClientsByRoomName(s);
  const next = rooms.map((r) => ({
    ...r,
    playersOnline: byName.get(r.colyseusRoomName) ?? 0,
  }));

  return { rooms: next, totalOnline, live: true };
}
