/**
 * ES: Registro de nodos de recurso de mapa (data-driven). Se fusiona con nodos estáticos del juego en `getWorldResourceNodeById` / `getWorldResourceNodesForMap`.
 * EN: Registry for world harvest nodes; merged with static game defs on lookup.
 */

export type ResourceNodeGrantSpec = { itemId: string; quantity: number };

export type ResourceNodeRegistration = {
  id: string;
  mapId: string;
  position: { x: number; y: number; z: number };
  /** ES: Radio XZ (m). EN: XZ radius (m). */
  radius: number;
  grants: ResourceNodeGrantSpec[];
  labelEs?: string;
  labelEn?: string;
  /** ES: `quarry` | `wood_pile` para arte del cliente; otro valor → mismo fallback que `wood_pile`. EN: Client mesh; unknown values use wood_pile fallback. */
  visual?: string;
};

const byId = new Map<string, ResourceNodeRegistration>();

/**
 * ES: Idempotente por `id`: segundo registro con mismo id se ignora con aviso.
 * EN: Idempotent by `id`; duplicate registration logs a warning and is skipped.
 */
export function registerResourceNode(node: ResourceNodeRegistration): void {
  if (!node.id?.trim()) {
    console.warn("[registerResourceNode] skipped — empty id");
    return;
  }
  if (byId.has(node.id)) {
    console.warn(
      `[registerResourceNode] duplicate id "${node.id}" — keeping first`
    );
    return;
  }
  byId.set(node.id, { ...node, id: node.id.trim() });
}

export function getResourceNodeRegistrations(): ResourceNodeRegistration[] {
  return [...byId.values()];
}

/** ES: Tests o hot-reload. EN: Tests or dev reset. */
export function clearResourceNodeRegistry(): void {
  byId.clear();
}

export function getRegisteredResourceNodeById(
  id: string
): ResourceNodeRegistration | undefined {
  return byId.get(id);
}
