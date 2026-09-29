import { composeSceneTransform, getSceneBoxProps, getSceneModelProps, resolveSceneWorldEntities, type SceneDocumentV0_1, type SceneEntityV0_1 } from '@nexusworld3d/content-schema';

type Vector = [number, number, number];
export interface SceneStaticBox {
  entityId: string;
  position: Vector;
  rotation: [number, number, number, number];
  size: Vector;
}
export interface SceneRuntime {
  worldId: string;
  mapId: string;
  entities: SceneEntityV0_1[];
  staticBoxes: SceneStaticBox[];
  spawn: { position: Vector; yaw: number };
}
/** Engine-neutral snapshot of a validated document. Does not mutate authoring data. */
export function createSceneRuntime(document: SceneDocumentV0_1, mapId: string): SceneRuntime {
  const entities = resolveSceneWorldEntities(document.entities);
  const staticBoxes: SceneStaticBox[] = [];
  for (const entity of entities) {
    const box = getSceneBoxProps(entity);
    const model = getSceneModelProps(entity);
    const colliders = model?.mapId === mapId ? model.colliders : box?.solid && box.mapId === mapId
      ? [{ size: box.size, offset: [0, 0, 0] as Vector }] : [];
    for (const collider of colliders) {
      const pose = composeSceneTransform(entity.transform, {
        position: collider.offset, rotation: [0, 0, 0, 1], scale: [1, 1, 1],
      });
      staticBoxes.push({ entityId: entity.id, position: pose.position, rotation: pose.rotation,
        size: collider.size.map((value, axis) => value * entity.transform.scale[axis]) as Vector });
    }
  }
  const spawn = document.spawn?.mapId === mapId ? document.spawn : undefined;
  return { worldId: document.worldId, mapId, entities, staticBoxes,
    spawn: { position: spawn ? [...spawn.position] : [0, 2, 6], yaw: spawn?.yaw ?? 0 } };
}

export interface ScenePhysicsAdapter {
  /** Return ownership cleanup. If this throws, it must undo its own partial allocation. */
  addStaticBox(box: SceneStaticBox): () => void;
}
export class SceneRuntimeCleanupError extends Error {
  constructor(public readonly errors: unknown[]) {
    super('Scene runtime cleanup failed');
    this.name = 'SceneRuntimeCleanupError';
  }
}
/** Own only these scene bodies, never the adapter's world or player. */
export function mountSceneRuntime(runtime: SceneRuntime, adapter: ScenePhysicsAdapter): () => void {
  const cleanup: Array<() => void> = [];
  const dispose = () => {
    const errors: unknown[] = [];
    for (const remove of cleanup.splice(0).reverse()) {
      try { remove(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new SceneRuntimeCleanupError(errors);
  };
  try {
    for (const box of runtime.staticBoxes) cleanup.push(adapter.addStaticBox(box));
  } catch (error) {
    try { dispose(); } catch (cleanupError) { throw new SceneRuntimeCleanupError([error, cleanupError]); }
    throw error;
  }
  return dispose;
}
