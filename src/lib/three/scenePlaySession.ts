import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { CannonPhysics } from './cannonPhysics';
import { mountSceneBoxColliders } from './sceneBoxColliders';

/** An isolated editor simulation: never touches the shared game physics or network. */
export function createScenePlaySession(document: SceneDocumentV0_1, mapId: string) {
  const physics = new CannonPhysics();
  physics.createGround();
  const spawn = document.spawn?.mapId === mapId ? document.spawn : undefined;
  const position = spawn ? { x: spawn.position[0], y: spawn.position[1], z: spawn.position[2] } : { x: 0, y: 2, z: 6 };
  const player = physics.createPlayer(position);
  physics.teleportPlayer(position, { x: 0, y: spawn?.yaw ?? 0, z: 0 });
  const unmount = mountSceneBoxColliders(physics, document, mapId);
  let disposed = false;
  return { physics, player, dispose() {
    if (disposed) return;
    disposed = true;
    unmount();
    physics.dispose();
  } };
}
