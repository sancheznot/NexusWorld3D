import { z } from 'zod';
import type { SceneEntityV0_1 } from './sceneV0_1';

const dimension = z.number().finite().min(0.01).max(1000);

/** Root-level static primitives; hierarchy/compound bodies are a later format extension. */
export const sceneBoxPropsSchema = z.object({
  size: z.tuple([dimension, dimension, dimension]).default([1, 1, 1]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#a78bfa'),
  solid: z.boolean().default(true),
  mapId: z.string().min(1).max(128).default('exterior'),
}).strict();

export function getSceneBoxProps(entity: SceneEntityV0_1) {
  const component = entity.components.find(c => c.type === 'nexus:box');
  if (!component) return null;
  const result = sceneBoxPropsSchema.safeParse(component.props);
  return result.success ? result.data : null;
}
