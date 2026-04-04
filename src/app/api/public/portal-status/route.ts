import { NextResponse } from "next/server";
import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";
import type { PublicPortalRoom } from "@/types/gamePortal.types";
import { applyLiveMetricsToPortalRooms } from "@/lib/portalLiveMetrics";
import {
  fetchGameMonitorSnapshot,
  isGameMonitorConfigured,
} from "@/lib/gameMonitorProxy";

/**
 * ES: Datos públicos para lobby / home (sin auth). Jugadores/CCU vía monitor interno (mismo que admin).
 * EN: Public lobby / home data (no auth). Player counts/CCU via internal monitor (same as admin).
 */
export async function GET() {
  const mainRoom =
    process.env.NEXT_PUBLIC_COLYSEUS_ROOM?.trim() ||
    nexusWorld3DConfig.networking.colyseusRoomName;

  /** ES: Misma sala que main si no defines otra — invitados comparten shard. EN: Defaults to main room. */
  const guestRoom =
    process.env.NEXT_PUBLIC_COLYSEUS_GUEST_ROOM?.trim() || mainRoom;

  const maxPlayers = nexusWorld3DConfig.server.maxPlayers;

  const baseRooms: PublicPortalRoom[] = [
    {
      id: "guest",
      colyseusRoomName: guestRoom,
      displayName:
        process.env.NEXT_PUBLIC_GUEST_ROOM_LABEL?.trim() ||
        "Sala pública — sin cuenta",
      maxPlayers,
      playersOnline: null,
      status: "online",
      requiresAuth: false,
    },
    {
      id: "main",
      colyseusRoomName: mainRoom,
      displayName:
        process.env.NEXT_PUBLIC_MAIN_ROOM_LABEL?.trim() ||
        nexusWorld3DConfig.branding.defaultWorldDisplayName,
      maxPlayers,
      playersOnline: null,
      status: "online",
      requiresAuth: true,
    },
  ];

  let snapshot: unknown | null = null;
  if (isGameMonitorConfigured()) {
    snapshot = await fetchGameMonitorSnapshot();
  }

  const { rooms, totalOnline, live } = applyLiveMetricsToPortalRooms(
    baseRooms,
    snapshot
  );

  const headers = new Headers();
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(
    {
      appName: nexusWorld3DConfig.branding.appName,
      shortName: nexusWorld3DConfig.branding.shortName,
      rooms,
      totalOnline,
      live,
      liveMetricsNote: live
        ? "ES: CCU y jugadores por sala desde el monitor Colyseus (proceso local). EN: CCU and per-room counts from Colyseus monitor."
        : isGameMonitorConfigured()
          ? "ES: Monitor configurado pero no alcanzable desde Next (¿Colyseus arriba?). EN: Monitor configured but unreachable from Next."
          : "ES: Configura NEXUS_GAME_MONITOR_SECRET en el .env del servidor Next para contadores en vivo. EN: Set NEXUS_GAME_MONITOR_SECRET on the Next server for live counts.",
    },
    { headers }
  );
}
