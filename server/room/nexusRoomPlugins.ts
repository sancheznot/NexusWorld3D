import type { Room } from "colyseus";
import {
  WorldResourceNodeEvents,
  type WorldResourceNodeDeps,
} from "@server/modules/WorldResourceNodeEvents";

/**
 * ES: Contrato para montar subsistemas en `NexusWorldRoom` sin acoplar la sala a cada clase.
 * EN: Attach subsystems to the world room without hard-wiring every module in the room class.
 *
 * Plugins “core” usan id `core:*`; juegos privados pueden registrar `game:*` en su capa.
 */
export interface NexusRoomPlugin {
  readonly id: string;
  attach(room: Room): void;
}

export function attachNexusRoomPlugins(
  room: Room,
  plugins: NexusRoomPlugin[]
): void {
  for (const p of plugins) {
    p.attach(room);
  }
}

/** ES: Recolección en nodos del mapa (`world:harvest-node`). EN: Map resource node harvesting. */
export function createWorldResourceNodesPlugin(
  deps: WorldResourceNodeDeps
): NexusRoomPlugin {
  return {
    id: "core:world-resource-nodes",
    attach(room) {
      new WorldResourceNodeEvents(room, deps);
    },
  };
}
