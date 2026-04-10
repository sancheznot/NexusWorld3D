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

const metas = new Map<string, WorldToolMeta>();
const handlers = new Map<string, (ctx: WorldToolServerContext) => void>();

export function registerWorldTool(reg: WorldToolRegistration): void {
  if (!reg.id?.trim()) {
    console.warn("[registerWorldTool] skipped — empty id");
    return;
  }
  const id = reg.id.trim();
  if (metas.has(id)) {
    console.warn(`[registerWorldTool] duplicate id "${id}" — keeping first`);
    return;
  }
  const { serverOnUse, ...meta } = reg;
  metas.set(id, { ...meta, id });
  handlers.set(id, serverOnUse);
}

export function getWorldToolMeta(toolId: string): WorldToolMeta | undefined {
  return metas.get(toolId);
}

export function getWorldToolHandler(
  toolId: string
): ((ctx: WorldToolServerContext) => void) | undefined {
  return handlers.get(toolId);
}

/** ES: Metadatos sin handlers (p. ej. depuración / futuro SSR). EN: Metadata without handlers. */
export function getWorldToolClientDescriptors(): WorldToolMeta[] {
  return [...metas.values()];
}

export function clearWorldToolRegistry(): void {
  metas.clear();
  handlers.clear();
}
