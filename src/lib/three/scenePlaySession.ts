import { nearestSceneInteraction, resolveScenePortal, type SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { createSceneRuntime } from '@nexusworld3d/engine-client';
import { getWorldResourceNodeById } from '@/constants/worldResourceNodes';
import { CannonPhysics } from './cannonPhysics';
import { mountCannonSceneRuntime } from './sceneBoxColliders';

/** An isolated editor simulation: never touches the shared game physics or network. */
export function createScenePlaySession(document: SceneDocumentV0_1, mapId: string) {
  const runtime = createSceneRuntime(document, mapId);
  const physics = new CannonPhysics();
  try {
    physics.createGround();
    const spawn = runtime.spawn;
    const position = { x: spawn.position[0], y: spawn.position[1], z: spawn.position[2] };
    const player = physics.createPlayer(position);
    physics.teleportPlayer(position, { x: 0, y: spawn?.yaw ?? 0, z: 0 });
    const unmount = mountCannonSceneRuntime(physics, runtime);
    const entities = runtime.entities;
    const inventory = new Map<string, number>();
    const cooldowns = new Map<string, number>();
    let yaw = spawn?.yaw ?? 0;
    let disposed = false;
    return { physics, player, inventory, get yaw() { return yaw; }, interact(now = Date.now()) {
      if (disposed) return 'Simulación detenida';
      const zone = nearestSceneInteraction(entities, mapId, player.position);
      if (!zone) return 'Acércate a una zona, recurso o portal';
      if (now < (cooldowns.get(zone.id) ?? 0)) return 'Espera antes de volver a interactuar';
      cooldowns.set(zone.id, now + (zone.resourceId ? 3500 : 1000));
      if (zone.portal) {
        const target = resolveScenePortal(document, mapId, player.position, zone.id);
        if (target) { physics.teleportPlayer(target.position, target.rotation); yaw = target.rotation.y; }
        return `Portal: ${zone.label}`;
      }
      if (zone.resourceId) {
        const node = getWorldResourceNodeById(zone.resourceId);
        if (!node) return 'Recurso no registrado';
        for (const grant of node.grants) inventory.set(grant.itemId, (inventory.get(grant.itemId) ?? 0) + grant.quantity);
        return `Inventario de prueba: ${[...inventory].map(([id, count]) => `${id}: ${count}`).join(', ')}`;
      }
      return `Zona: ${zone.label}`;
    }, dispose() {
      if (disposed) return;
      disposed = true;
      try { unmount(); } finally {
        inventory.clear(); cooldowns.clear();
        physics.dispose();
      }
    } };
  } catch (error) {
    physics.dispose();
    throw error;
  }
}
