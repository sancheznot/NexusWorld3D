/**
 * ES: Reglas de apilado y fusión (cliente + servidor).
 * EN: Stacking / merge rules (client + server).
 */

import { ITEMS_CATALOG } from '@/constants/items';
import type { Inventory, InventoryItem } from '@/types/inventory.types';

export function catalogMaxStack(itemId: string): number {
  const c = ITEMS_CATALOG[itemId];
  const m = c?.maxStack;
  return typeof m === 'number' && m > 0 ? Math.floor(m) : 1;
}

export function catalogMaxDurability(itemId: string): number | undefined {
  const c = ITEMS_CATALOG[itemId];
  const m = c?.maxDurability;
  return typeof m === 'number' && m > 0 ? Math.floor(m) : undefined;
}

function hasDurabilityInstance(it: Pick<InventoryItem, 'maxDurability'>): boolean {
  return typeof it.maxDurability === 'number' && it.maxDurability > 0;
}

/** ES: ¿Se puede sumar `incomingQty` al stack `target`? EN: Can merge incoming into target stack? */
export function canMergeIntoStack(
  target: InventoryItem,
  incoming: Pick<InventoryItem, 'itemId' | 'maxDurability' | 'durability'>
): boolean {
  if (target.isEquipped) return false;
  if (target.itemId !== incoming.itemId) return false;
  if (target.quantity >= target.maxStack) return false;

  const tD = hasDurabilityInstance(target);
  const iD = hasDurabilityInstance(incoming as InventoryItem);
  if (!tD && !iD) return true;
  if (tD !== iD) return false;

  const tv = target.durability ?? target.maxDurability ?? 0;
  const iv = incoming.durability ?? incoming.maxDurability ?? 0;
  return tv === iv;
}

/**
 * ES: Fusiona pilas compatibles (mismo itemId, reglas de durabilidad, bajo maxStack).
 * EN: Merge compatible stacks after catalog maxStack corrections.
 */
export function coalesceInventoryStacks(inv: Inventory): void {
  const items = inv.items;
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < items.length; i++) {
      const a = items[i];
      if (!a || a.isEquipped) continue;
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];
        if (!b || b.isEquipped) continue;
        if (!canMergeIntoStack(a, b)) continue;
        if (!canMergeIntoStack(b, a)) continue;
        if (a.itemId !== b.itemId) continue;

        const maxS = Math.max(1, a.maxStack);
        const room = maxS - a.quantity;
        if (room <= 0) continue;
        const move = Math.min(room, b.quantity);
        if (move <= 0) continue;
        a.quantity += move;
        b.quantity -= move;
        if (b.quantity <= 0) {
          items.splice(j, 1);
        }
        changed = true;
        break outer;
      }
    }
  }
  inv.usedSlots = items.length;
}

/** ES: Alinea maxStack con catálogo si el guardado es más bajo (p. ej. troncos antes a 30). EN: Bump maxStack from catalog. */
export function applyCatalogStackCapsToItems(items: InventoryItem[]): void {
  for (const it of items) {
    const cat = catalogMaxStack(it.itemId);
    if (cat > 1) {
      it.maxStack = Math.max(it.maxStack ?? 1, cat);
    }
  }
}

function newStackInstanceId(itemId: string): string {
  return `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ES: Si quantity > maxStack (datos viejos), parte en más pilas o sube maxStack si no hay ranuras.
 * EN: Split stacks that exceed maxStack; if no free slots, bump maxStack to avoid losing items.
 */
export function splitOversizedStacks(inv: Inventory): void {
  const items = inv.items;
  let i = 0;
  while (i < items.length) {
    const it = items[i]!;
    if (it.isEquipped) {
      i++;
      continue;
    }
    const cap = Math.max(1, Math.floor(it.maxStack ?? 1));
    if (it.quantity <= cap) {
      i++;
      continue;
    }
    if (items.length >= inv.maxSlots) {
      it.maxStack = Math.max(cap, it.quantity);
      i++;
      continue;
    }
    const chunk = cap;
    const peeled: InventoryItem = {
      ...it,
      id: newStackInstanceId(it.itemId),
      quantity: chunk,
      isEquipped: false,
      slot: -1,
    };
    it.quantity -= chunk;
    items.push(peeled);
  }
  inv.usedSlots = items.length;
}
