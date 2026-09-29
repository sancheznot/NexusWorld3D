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

export interface ResourceNodeRegistry {
  registerResourceNode(node: ResourceNodeRegistration): () => void;
  getResourceNodeRegistrations(): ResourceNodeRegistration[];
  getRegisteredResourceNodeById(id: string): ResourceNodeRegistration | undefined;
  clearResourceNodeRegistry(): void;
  fork(): ResourceNodeRegistry;
}
const copyNode = (node: ResourceNodeRegistration): ResourceNodeRegistration => ({
  ...node, position: { ...node.position }, grants: node.grants.map(grant => ({ ...grant })),
});
/** Each instance owns its data; returned metadata is detached from stored definitions. */
export function createResourceNodeRegistry(initial: readonly ResourceNodeRegistration[] = []): ResourceNodeRegistry {
  const byId = new Map<string, ResourceNodeRegistration>();
  const registry: ResourceNodeRegistry = {
    registerResourceNode(node) {
      const id = node.id?.trim();
      if (!id || byId.has(id)) {
        console.warn('[registerResourceNode] skipped empty or duplicate id');
        return () => {};
      }
      const stored = copyNode({ ...node, id });
      byId.set(id, stored);
      return () => { if (byId.get(id) === stored) byId.delete(id); };
    },
    getResourceNodeRegistrations: () => [...byId.values()].map(copyNode),
    getRegisteredResourceNodeById(id) { const node = byId.get(id); return node ? copyNode(node) : undefined; },
    clearResourceNodeRegistry: () => byId.clear(),
    fork: () => createResourceNodeRegistry([...byId.values()]),
  };
  for (const node of initial) registry.registerResourceNode(node);
  return registry;
}
/** Legacy process-wide template; running worlds should inject a fork. */
export const defaultResourceNodeRegistry = createResourceNodeRegistry();
export const { registerResourceNode, getResourceNodeRegistrations, getRegisteredResourceNodeById, clearResourceNodeRegistry } = defaultResourceNodeRegistry;
