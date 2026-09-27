import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { CannonPhysics } from './cannonPhysics';
import { mountSceneBoxColliders } from './sceneBoxColliders';

/** An isolated editor simulation: never touches the shared game physics or network. */
export function createScenePlaySession(document: SceneDocumentV0_1, mapId: string) {
  const physics = new CannonPhysics();
  physics.createGround();
  const player = physics.createPlayer({ x: 0, y: 2, z: 6 });
  physics.teleportPlayer({ x: 0, y: 2, z: 6 });
  const unmount = mountSceneBoxColliders(physics, document, mapId);
  let disposed = false;
  return { physics, player, dispose() {
    if (disposed) return;
    disposed = true;
    unmount();
    physics.dispose();
  } };
}
