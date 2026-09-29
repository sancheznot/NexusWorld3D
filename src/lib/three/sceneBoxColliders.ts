import { Body, Box, Vec3 } from 'cannon-es';
import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { createSceneRuntime, mountSceneRuntime, type SceneRuntime } from '@nexusworld3d/engine-client';
import { CollisionGroups, CollisionMasks } from '@/constants/collisionGroups';
import type { CannonPhysics } from './cannonPhysics';

/** Install primitive boxes and model compound-box colliders from a validated scene. */
export function mountSceneBoxColliders(physics: CannonPhysics, doc: SceneDocumentV0_1, mapId: string) {
  return mountCannonSceneRuntime(physics, createSceneRuntime(doc, mapId));
}

/** Cannon is an adapter; scene interpretation and lifetime live in the package. */
export function mountCannonSceneRuntime(physics: CannonPhysics, runtime: SceneRuntime) {
  const world = physics.getWorld();
  return mountSceneRuntime(runtime, {
    addStaticBox(collider) {
      const size = collider.size;
      const body = new Body({ mass: 0, shape: new Box(new Vec3(size[0] / 2, size[1] / 2, size[2] / 2)),
        collisionFilterGroup: CollisionGroups.Default, collisionFilterMask: CollisionMasks.Default });
      body.position.set(...collider.position);
      body.quaternion.set(...collider.rotation);
      try { world.addBody(body); } catch (error) { world.removeBody(body); throw error; }
      return () => { world.removeBody(body); };
    },
  });
}
