import itemsClient from "@/lib/colyseus/ItemsClient";
import { colyseusClient } from "@/lib/colyseus/client";
import { inventoryService } from "@/lib/services/inventory";
import { useGameWorldStore } from "@/store/gameWorldStore";
import { useUIStore } from "@/store/uiStore";
import { getHotbarRow } from "@/lib/gameplay/inventoryHotbar";

let lastDropAt = 0;
const DROP_COOLDOWN_MS = 500;

/**
 * ES: Suelta 1 unidad del ítem seleccionado en la hotbar (servidor).
 * EN: Drop 1 unit of hotbar-selected stack (server).
 */
export function tryDropSelectedHotbarItem(quantity = 1): boolean {
  if (!colyseusClient.isConnectedToWorldRoom()) return false;
  const now = Date.now();
  if (now - lastDropAt < DROP_COOLDOWN_MS) return false;

  const slot = useUIStore.getState().hotbarSelectedSlot;
  const row = getHotbarRow(inventoryService.getInventory());
  const item = row[slot];
  if (!item || item.isEquipped) return false;

  lastDropAt = now;
  const mapId = useGameWorldStore.getState().activeMapId;
  itemsClient.dropItemToWorld({
    mapId,
    itemInstanceId: item.id,
    quantity: Math.min(quantity, item.quantity),
  });
  return true;
}

/**
 * ES: Suelta por id de instancia de inventario (p. ej. panel de inventario).
 * EN: Drop by inventory instance id (e.g. inventory panel).
 */
export function tryDropInventoryItemById(
  itemInstanceId: string,
  quantity = 1
): boolean {
  if (!colyseusClient.isConnectedToWorldRoom()) return false;
  const now = Date.now();
  if (now - lastDropAt < DROP_COOLDOWN_MS) return false;

  const inv = inventoryService.getInventory();
  const item = inv.items.find((i) => i.id === itemInstanceId);
  if (!item || item.isEquipped) return false;

  lastDropAt = now;
  const mapId = useGameWorldStore.getState().activeMapId;
  itemsClient.dropItemToWorld({
    mapId,
    itemInstanceId: item.id,
    quantity: Math.min(quantity, item.quantity),
  });
  return true;
}
