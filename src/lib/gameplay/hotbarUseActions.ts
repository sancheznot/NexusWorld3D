import inventoryClient from "@/lib/colyseus/InventoryClient";
import { colyseusClient } from "@/lib/colyseus/client";
import { inventoryService } from "@/lib/services/inventory";
import { useUIStore } from "@/store/uiStore";
import { getHotbarRow } from "@/lib/gameplay/inventoryHotbar";

let lastUseAt = 0;
const USE_COOLDOWN_MS = 400;

/**
 * ES: Usa el consumible de la ranura rápida seleccionada (servidor aplica efectos).
 * EN: Use consumable in selected quick slot (server applies effects).
 */
export function tryUseSelectedHotbarConsumable(): boolean {
  if (!colyseusClient.isConnectedToWorldRoom()) return false;
  const now = Date.now();
  if (now - lastUseAt < USE_COOLDOWN_MS) return false;

  const slot = useUIStore.getState().hotbarSelectedSlot;
  const row = getHotbarRow(inventoryService.getInventory());
  const item = row[slot];
  if (!item || item.type !== "consumable") return false;

  lastUseAt = now;
  inventoryClient.useItem(item.id, item.itemId, item.slot ?? -1);
  return true;
}
