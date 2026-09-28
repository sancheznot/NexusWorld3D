import type { SceneEntityV0_1 } from './sceneV0_1';

type Transform = SceneEntityV0_1['transform'];
type Vec3 = Transform['position'];
type Quat = Transform['rotation'];
export const MAX_SCENE_HIERARCHY_DEPTH = 64;

export function isSceneGroup(entity: SceneEntityV0_1): boolean {
  return entity.components.some(component => component.type === 'nexus:group');
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(...q);
  return q.map(value => value / length) as Quat;
}
function multiply(a: Quat, b: Quat): Quat {
  const [x, y, z, w] = a, [u, v, t, s] = b;
  return normalize([w*u+x*s+y*t-z*v, w*v-x*t+y*s+z*u, w*t+x*v-y*u+z*s, w*s-x*u-y*v-z*t]);
}
function rotate(v: Vec3, q: Quat): Vec3 {
  const [x, y, z] = v, [u, vq, t, w] = normalize(q);
  const tx = 2*(vq*z-t*y), ty = 2*(t*x-u*z), tz = 2*(u*y-vq*x);
  return [x+w*tx+vq*tz-t*ty, y+w*ty+t*tx-u*tz, z+w*tz+u*ty-vq*tx];
}

/** Exact TRS composition when ancestors have uniform scale (enforced by schema). */
export function composeSceneTransform(parent: Transform, local: Transform): Transform {
  const offset = rotate(local.position.map((v, i) => v * parent.scale[i]) as Vec3, parent.rotation);
  return {
    position: offset.map((v, i) => v + parent.position[i]) as Vec3,
    rotation: multiply(normalize(parent.rotation), normalize(local.rotation)),
    scale: local.scale.map((v, i) => v * parent.scale[i]) as Vec3,
  };
}

/** Convert world TRS to a uniform-scale parent's space, preserving world pose. */
export function sceneTransformRelativeTo(world: Transform, parent: Transform): Transform {
  const [x, y, z, w] = normalize(parent.rotation);
  const inverse: Quat = [-x, -y, -z, w];
  const offset = rotate(world.position.map((v, i) => v - parent.position[i]) as Vec3, inverse);
  return {
    position: offset.map((v, i) => v / parent.scale[i]) as Vec3,
    rotation: multiply(inverse, normalize(world.rotation)),
    scale: world.scale.map((v, i) => v / parent.scale[i]) as Vec3,
  };
}

/** Linear, iterative traversal; independent of entity ordering and safe against cycles. */
export function resolveSceneWorldEntities(entities: SceneEntityV0_1[]): SceneEntityV0_1[] {
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  if (byId.size !== entities.length) throw new Error('Duplicate scene entity');
  const resolved = new Map<string, SceneEntityV0_1>();
  const depths = new Map<string, number>();
  for (const entity of entities) {
    const chain: SceneEntityV0_1[] = [];
    const visiting = new Set<string>();
    let current: SceneEntityV0_1 | undefined = entity;
    while (current && !resolved.has(current.id)) {
      if (visiting.has(current.id)) throw new Error('Scene parent cycle');
      visiting.add(current.id);
      chain.push(current);
      if (chain.length > MAX_SCENE_HIERARCHY_DEPTH) throw new Error('Scene hierarchy too deep');
      const parentId: string | null = current.parentId;
      current = parentId === null ? undefined : byId.get(parentId);
      if (parentId !== null && !current) throw new Error('Unknown scene parent');
    }
    for (let i = chain.length - 1; i >= 0; i--) {
      const item = chain[i];
      const parent = item.parentId === null ? undefined : resolved.get(item.parentId);
      const depth = parent ? depths.get(parent.id)! + 1 : 1;
      if (depth > MAX_SCENE_HIERARCHY_DEPTH) throw new Error('Scene hierarchy too deep');
      depths.set(item.id, depth);
      resolved.set(item.id, { ...item, transform: parent ? composeSceneTransform(parent.transform, item.transform) : item.transform });
    }
  }
  return entities.map(entity => resolved.get(entity.id)!);
}
