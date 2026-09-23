import { Body, Box, Vec3 } from 'cannon-es';
import { getSceneBoxProps, type SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { CollisionGroups, CollisionMasks } from '@/constants/collisionGroups';
import type { CannonPhysics } from './cannonPhysics';

/** Install a validated scene's static boxes and return an idempotent teardown. */
export function mountSceneBoxColliders(physics: CannonPhysics, doc: SceneDocumentV0_1, mapId: string) {
  const world = physics.getWorld();
  const bodies: Body[] = [];
  for (const entity of doc.entities) {
    const props = getSceneBoxProps(entity);
    if (!props?.solid || props.mapId !== mapId || entity.parentId !== null) continue;
    const size = props.size.map((s, i) => s * entity.transform.scale[i]);
    const body = new Body({ mass: 0, shape: new Box(new Vec3(size[0] / 2, size[1] / 2, size[2] / 2)),
      collisionFilterGroup: CollisionGroups.Default, collisionFilterMask: CollisionMasks.Default });
    body.position.set(...entity.transform.position);
    body.quaternion.set(...entity.transform.rotation);
    body.quaternion.normalize();
    world.addBody(body);
    bodies.push(body);
  }
  return () => {
    for (const body of bodies.splice(0)) world.removeBody(body);
  };
}
