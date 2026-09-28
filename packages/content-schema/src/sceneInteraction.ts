import { z } from 'zod';
import type { SceneDocumentV0_1, SceneEntityV0_1 } from './sceneV0_1';
import { resolveSceneWorldEntities } from './sceneHierarchy';
export const sceneResourcePropsSchema = z.object({ nodeId: z.string().trim().min(1).max(128) }).strict();
export const sceneTriggerPropsSchema = z.object({
  radius: z.number().finite().min(0.1).max(100),
  label: z.string().trim().min(1).max(120).optional(),
  mapId: z.string().min(1).max(80).optional(),
}).strict();
const coordinate = z.number().finite().min(-1e6).max(1e6);
export const scenePortalPropsSchema = z.object({
  targetPosition: z.tuple([coordinate, z.number().finite().min(1.05).max(1e6), coordinate]),
  yaw: z.number().finite().min(-Math.PI * 2).max(Math.PI * 2).default(0),
}).strict();
export function getSceneInteraction(entity: SceneEntityV0_1) {
  const trigger = entity.components.find(c => c.type === 'nexus:triggerSphere');
  if (!trigger) return null;
  const props = sceneTriggerPropsSchema.parse(trigger.props);
  const portal = entity.components.find(c => c.type === 'nexus:portal');
  const resource = entity.components.find(c => c.type === 'nexus:resourceNode');
  return { id: entity.id, position: entity.transform.position, radius: props.radius * entity.transform.scale[0],
    mapId: props.mapId ?? 'exterior', label: props.label ?? (portal ? 'Portal' : resource ? 'Recurso' : 'Zona'),
    portal: portal ? scenePortalPropsSchema.parse(portal.props) : null,
    resourceId: resource ? sceneResourcePropsSchema.parse(resource.props).nodeId : null };
}
export function resolveScenePortal(document: SceneDocumentV0_1 | null, mapId: string, position: { x: number; y: number; z: number }, id: unknown) {
  if (!document || typeof id !== 'string') return null;
  const entity = resolveSceneWorldEntities(document.entities).find(entity => entity.id === id);
  const zone = entity && getSceneInteraction(entity);
  if (!zone?.portal || zone.mapId !== mapId || Math.hypot(position.x-zone.position[0], position.y-zone.position[1], position.z-zone.position[2]) > zone.radius + 0.75) return null;
  const [x, y, z] = zone.portal.targetPosition;
  return { mapId, position: { x, y, z }, rotation: { x: 0, y: zone.portal.yaw, z: 0 } };
}

export function nearestSceneInteraction(entities: SceneEntityV0_1[], mapId: string, position: { x: number; y: number; z: number }) {
  let nearest: ReturnType<typeof getSceneInteraction> = null;
  let distance = Infinity;
  for (const entity of entities) {
    const zone = getSceneInteraction(entity);
    if (!zone || zone.mapId !== mapId) continue;
    const d = Math.hypot(position.x-zone.position[0], position.y-zone.position[1], position.z-zone.position[2]);
    if (d <= zone.radius && d < distance) { nearest = zone; distance = d; }
  }
  return nearest;
}
