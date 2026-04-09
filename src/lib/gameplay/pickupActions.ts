import itemsClient from "@/lib/colyseus/ItemsClient";
import { colyseusClient } from "@/lib/colyseus/client";
import { usePlayerStore } from "@/store/playerStore";
import { useGameWorldStore } from "@/store/gameWorldStore";
import { worldPickupFindNearest } from "@/lib/world/worldPickupRegistry";

let lastPickupAt = 0;
const PICKUP_COOLDOWN_MS = 450;

/**
 * ES: Intenta recoger el pickup mundial más cercano (servidor autoritativo).
 * EN: Try to collect nearest world pickup (server-authoritative).
 */
export function tryPickupNearestWorldItem(playerReachMeters = 0.85): boolean {
  if (!colyseusClient.isConnectedToWorldRoom()) return false;
  const now = Date.now();
  if (now - lastPickupAt < PICKUP_COOLDOWN_MS) return false;

  const pos = usePlayerStore.getState().position;
  const mapId = useGameWorldStore.getState().activeMapId;
  const nearest = worldPickupFindNearest(
    mapId,
    pos.x,
    pos.y,
    pos.z,
    playerReachMeters
  );
  if (!nearest) return false;

  lastPickupAt = now;
  itemsClient.collectItem({ mapId: nearest.mapId, spawnId: nearest.spawnId });
  return true;
}
