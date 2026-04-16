import type { SceneDocumentV0_1 } from "./sceneV0_1";

/**
 * ES: Posición (y radio opcional) de un `nexus:resourceNode` definido en escena v0.1.
 * EN: Position (and optional radius) for a `nexus:resourceNode` in a v0.1 scene document.
 */
export type ResourceNodeSceneOverride = {
  position: { x: number; y: number; z: number };
  /** ES: De `nexus:triggerSphere` cuando existe. EN: From `nexus:triggerSphere` when present. */
  interactionRadius?: number;
};

/**
 * ES: Busca la entidad que referencia `nodeId` y devuelve transform + radio de interacción.
 * EN: Finds the entity referencing `nodeId` and returns transform + interaction radius.
 */
export function findResourceNodeOverrideInDocument(
  doc: SceneDocumentV0_1 | null | undefined,
  nodeId: string
): ResourceNodeSceneOverride | null {
  if (!doc?.entities?.length) return null;
  for (const ent of doc.entities) {
    for (const c of ent.components) {
      if (c.type !== "nexus:resourceNode") continue;
      const p = c.props as { nodeId?: string } | undefined;
      if (p?.nodeId !== nodeId) continue;
      const [x, y, z] = ent.transform.position;
      let interactionRadius: number | undefined;
      for (const c2 of ent.components) {
        if (c2.type === "nexus:triggerSphere") {
          const r = (c2.props as { radius?: number } | undefined)?.radius;
          if (typeof r === "number" && Number.isFinite(r) && r > 0) {
            interactionRadius = r;
            break;
          }
        }
      }
      return {
        position: { x, y, z },
        ...(interactionRadius !== undefined ? { interactionRadius } : {}),
      };
    }
  }
  return null;
}

/**
 * ES: `true` si la entidad declara `nexus:resourceNode` (no dibujar preview caja duplicada).
 * EN: `true` if entity declares `nexus:resourceNode` (skip duplicate preview box).
 */
export function entityHasResourceNodeComponent(entity: {
  components: { type: string }[];
}): boolean {
  return entity.components.some((c) => c.type === "nexus:resourceNode");
}
