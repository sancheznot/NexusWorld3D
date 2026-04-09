import type { Equipment, Inventory, InventoryItem } from "@/types/inventory.types";
import { isChopAxeItemId } from "@/constants/choppableTrees";

const HOTBAR_SLOT_COUNT = 5;

function hasUsableAxe(item: InventoryItem | undefined): boolean {
  if (!item || !isChopAxeItemId(item.itemId)) return false;
  return (item.quantity ?? 1) > 0;
}

/**
 * ES: Una fila de 5 ranuras (slots 0–4 del inventario). Vacío si no hay ítem en ese slot.
 * EN: Five UI hotbar cells mapped to inventory slots 0–4.
 */
export function getHotbarRow(inv: Inventory): (InventoryItem | undefined)[] {
  const row: (InventoryItem | undefined)[] = Array(HOTBAR_SLOT_COUNT).fill(
    undefined
  );
  for (const it of inv.items) {
    if (
      typeof it.slot === "number" &&
      it.slot >= 0 &&
      it.slot < HOTBAR_SLOT_COUNT
    ) {
      row[it.slot] = it;
    }
  }
  return row;
}

/**
 * ES: Hacha “activa” para mundo (modelo en mano + click talar): ranura 1–5 seleccionada
 * **o** arma equipada en el panel de equipamiento (no es lo mismo que solo tenerla en el slot 2 del grid).
 * EN: Axe active for world: selected hotbar 1–5 **or** weapon equipped in equipment panel.
 */
export function isToolAxeActiveForWorldActions(
  inv: Inventory,
  equipment: Equipment,
  hotbarSelectedSlot: number
): boolean {
  const row = getHotbarRow(inv);
  if (hasUsableAxe(row[hotbarSelectedSlot])) return true;
  const w = equipment.weapon;
  if (hasUsableAxe(w)) return true;
  if (
    inv.items.some(
      (i) =>
        isChopAxeItemId(i.itemId) &&
        i.isEquipped &&
        (i.quantity ?? 1) > 0
    )
  ) {
    return true;
  }
  return false;
}

export { HOTBAR_SLOT_COUNT };
