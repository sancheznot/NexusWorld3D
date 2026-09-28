import { getSceneBoxProps, getSceneModelProps, getSceneInteraction, type SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
const supported = new Set(['nexus:group', 'nexus:box', 'nexus:model', 'nexus:triggerSphere', 'nexus:resourceNode', 'nexus:portal']);
/** Public authoring currently runs the exterior component set, not arbitrary plugin scripts. */
export function assertScenePlayable(document: SceneDocumentV0_1) {
  for (const entity of document.entities) {
    if (!entity.components.length || entity.components.some(component => !supported.has(component.type))) throw new Error(`unsupported_public_component:${entity.id}`);
    const mapId = getSceneBoxProps(entity)?.mapId ?? getSceneModelProps(entity)?.mapId ?? getSceneInteraction(entity)?.mapId;
    if (mapId && mapId !== 'exterior') throw new Error('public_scene_requires_exterior_map');
  }
}
