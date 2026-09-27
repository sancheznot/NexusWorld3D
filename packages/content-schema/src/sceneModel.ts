import { z } from 'zod';
import type { SceneEntityV0_1 } from './sceneV0_1';

const dimension = z.number().finite().min(0.01).max(1000);
const offset = z.number().finite().min(-1000).max(1000);
const colliderSchema = z.object({
  size: z.tuple([dimension, dimension, dimension]),
  offset: z.tuple([offset, offset, offset]),
}).strict();
export const sceneModelAssetSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  name: z.string().min(1).max(120),
  // Curated same-origin files only. No arbitrary URLs, traversal or temporary uploads.
  url: z.string().regex(/^\/scene-assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:glb|gltf)$/),
  colliders: z.array(colliderSchema).max(32).default([]),
}).strict();
export const sceneModelPropsSchema = z.object({
  assetId: sceneModelAssetSchema.shape.id,
  mapId: z.string().min(1).max(128).default('exterior'),
  colliders: z.array(colliderSchema).max(32).default([]),
}).strict();
export type SceneModelProps = z.infer<typeof sceneModelPropsSchema>;
export type SceneModelAsset = z.infer<typeof sceneModelAssetSchema>;
export function getSceneModelProps(entity: SceneEntityV0_1): SceneModelProps | null {
  const component = entity.components.find(c => c.type === 'nexus:model');
  if (!component) return null;
  const result = sceneModelPropsSchema.safeParse(component.props);
  return result.success ? result.data : null;
}
