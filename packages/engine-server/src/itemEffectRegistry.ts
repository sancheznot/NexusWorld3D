import type { Client, Room } from "colyseus";

/**
 * ES: Contexto al usar un consumible (tras validar tipo y antes de quitar del stack).
 * EN: Context when a consumable is used (after type check, before stack decrement).
 */
export type ItemConsumeEffectContext = {
  room: Room;
  client: Client;
  playerId: string;
  itemId: string;
  /** ES: `EconomyEvents` si `InventoryEvents` se construyó con economía. EN: Economy hook if wired. */
  economy?: unknown;
};

/**
 * ES: Sin retorno asíncrono en v1 (evita carreras con el consumo del stack).
 * EN: Synchronous-only in v1 to avoid races with stack consumption.
 */
export type ItemConsumeEffect = (ctx: ItemConsumeEffectContext) => void;

const byItemId = new Map<string, ItemConsumeEffect[]>();

export function registerItemEffect(
  itemId: string,
  onConsume: ItemConsumeEffect
): void {
  const key = itemId.trim();
  if (!key) {
    console.warn("[registerItemEffect] skipped — empty itemId");
    return;
  }
  const list = byItemId.get(key) ?? [];
  list.push(onConsume);
  byItemId.set(key, list);
}

export function getItemConsumeEffects(itemId: string): ItemConsumeEffect[] {
  return [...(byItemId.get(itemId) ?? [])];
}

export function clearItemEffectRegistry(): void {
  byItemId.clear();
}
