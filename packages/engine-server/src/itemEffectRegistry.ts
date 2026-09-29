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

export interface ItemEffectRegistry {
  registerItemEffect(itemId: string, onConsume: ItemConsumeEffect): () => void;
  getItemConsumeEffects(itemId: string): ItemConsumeEffect[];
  clearItemEffectRegistry(): void;
  fork(): ItemEffectRegistry;
}
export function createItemEffectRegistry(initial: ReadonlyArray<readonly [string, ItemConsumeEffect]> = []): ItemEffectRegistry {
  const byItemId = new Map<string, Array<{ effect: ItemConsumeEffect }>>();
  const registry: ItemEffectRegistry = {
    registerItemEffect(itemId, onConsume) {
      const key = itemId.trim();
      if (!key) { console.warn('[registerItemEffect] skipped empty itemId'); return () => {}; }
      const entry = { effect: onConsume };
      const list = byItemId.get(key) ?? [];
      list.push(entry); byItemId.set(key, list);
      return () => {
        const current = byItemId.get(key);
        if (!current) return;
        const index = current.indexOf(entry);
        if (index < 0) return;
        current.splice(index, 1);
        if (!current.length) byItemId.delete(key);
      };
    },
    getItemConsumeEffects: itemId => (byItemId.get(itemId) ?? []).map(entry => entry.effect),
    clearItemEffectRegistry: () => byItemId.clear(),
    fork: () => createItemEffectRegistry([...byItemId].flatMap(([key, entries]) => entries.map(entry => [key, entry.effect] as const))),
  };
  for (const [id, effect] of initial) registry.registerItemEffect(id, effect);
  return registry;
}
export const defaultItemEffectRegistry = createItemEffectRegistry();
export const { registerItemEffect, getItemConsumeEffects, clearItemEffectRegistry } = defaultItemEffectRegistry;
