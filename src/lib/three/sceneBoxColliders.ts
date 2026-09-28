import { Body, Box, Vec3 } from 'cannon-es';
import { getSceneBoxProps, getSceneModelProps, resolveSceneWorldEntities, type SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { CollisionGroups, CollisionMasks } from '@/constants/collisionGroups';
import type { CannonPhysics } from './cannonPhysics';

/** Install primitive boxes and model compound-box colliders from a validated scene. */
export function mountSceneBoxColliders(physics: CannonPhysics, doc: SceneDocumentV0_1, mapId: string) {
  const world = physics.getWorld();
  const bodies: Body[] = [];
  for (const entity of resolveSceneWorldEntities(doc.entities)) {
    const props = getSceneBoxProps(entity);
    const model = getSceneModelProps(entity);
    const colliders = model?.mapId === mapId ? model.colliders : props?.solid && props.mapId === mapId
      ? [{ size: props.size, offset: [0, 0, 0] }] : [];
    for (const collider of colliders) {
      const size = collider.size.map((s, i) => s * entity.transform.scale[i]);
      const body = new Body({ mass: 0, shape: new Box(new Vec3(size[0] / 2, size[1] / 2, size[2] / 2)),
        collisionFilterGroup: CollisionGroups.Default, collisionFilterMask: CollisionMasks.Default });
      body.position.set(...entity.transform.position);
      body.quaternion.set(...entity.transform.rotation);
      body.quaternion.normalize();
      const offset = new Vec3(...collider.offset.map((value, i) => value * entity.transform.scale[i]) as [number, number, number]);
      body.quaternion.vmult(offset, offset);
      body.position.vadd(offset, body.position);
      world.addBody(body);
      bodies.push(body);
    }
  }
  return () => {
    for (const body of bodies.splice(0)) world.removeBody(body);
  };
}
