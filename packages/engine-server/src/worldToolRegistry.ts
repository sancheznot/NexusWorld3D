import type { Client, Room } from "colyseus";

export type WorldToolServerContext = {
  room: Room;
  client: Client;
  playerId: string;
  toolId: string;
  /** ES: Payload crudo del mensaje (incluye `toolId`). EN: Raw message payload. */
  payload: Record<string, unknown>;
};

export type WorldToolClientTargetHint = { key: string; value: string };

export type WorldToolMeta = {
  id: string;
  itemIds: readonly string[];
  /** ES: Wear/durability (futuro). EN: Future durability key. */
  durabilityKey?: string;
  /**
   * ES: Pista para raycast en cliente: `object.userData[key] === value`.
   * EN: Client raycast hint — match `userData[key] === value`.
   */
  clientTargetUserData?: WorldToolClientTargetHint;
};

export type WorldToolRegistration = WorldToolMeta & {
  serverOnUse: (ctx: WorldToolServerContext) => void;
};

export interface WorldToolRegistry {
  registerWorldTool(reg: WorldToolRegistration): () => void;
  getWorldToolMeta(toolId: string): WorldToolMeta | undefined;
  getWorldToolHandler(toolId: string): WorldToolRegistration['serverOnUse'] | undefined;
  getWorldToolClientDescriptors(): WorldToolMeta[];
  clearWorldToolRegistry(): void;
  fork(): WorldToolRegistry;
}
const copyMeta = (meta: WorldToolMeta): WorldToolMeta => ({ ...meta, itemIds: [...meta.itemIds],
  ...(meta.clientTargetUserData ? { clientTargetUserData: { ...meta.clientTargetUserData } } : {}),
});
export function createWorldToolRegistry(initial: readonly WorldToolRegistration[] = []): WorldToolRegistry {
  const entries = new Map<string, { meta: WorldToolMeta; handler: WorldToolRegistration['serverOnUse'] }>();
  const registry: WorldToolRegistry = {
    registerWorldTool(reg) {
      const id = reg.id?.trim();
      if (!id || entries.has(id)) { console.warn('[registerWorldTool] skipped empty or duplicate id'); return () => {}; }
      const { serverOnUse, ...meta } = reg;
      const stored = { meta: copyMeta({ ...meta, id }), handler: serverOnUse };
      entries.set(id, stored);
      return () => { if (entries.get(id) === stored) entries.delete(id); };
    },
    getWorldToolMeta(id) {
      const entry = entries.get(id);
      if (!entry) return undefined;
      return copyMeta(entry.meta);
    },
    getWorldToolHandler: id => entries.get(id)?.handler,
    getWorldToolClientDescriptors: () => [...entries.keys()].map(id => registry.getWorldToolMeta(id)!),
    clearWorldToolRegistry: () => entries.clear(),
    fork: () => createWorldToolRegistry([...entries.values()].map(entry => ({ ...entry.meta, serverOnUse: entry.handler }))),
  };
  for (const entry of initial) registry.registerWorldTool(entry);
  return registry;
}
export const defaultWorldToolRegistry = createWorldToolRegistry();
export const { registerWorldTool, getWorldToolMeta, getWorldToolHandler, getWorldToolClientDescriptors, clearWorldToolRegistry } = defaultWorldToolRegistry;
