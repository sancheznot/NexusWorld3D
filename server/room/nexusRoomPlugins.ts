import type { NexusRoomPlugin } from "@nexusworld3d/engine-server";
export { attachNexusRoomPlugins, type NexusRoomPlugin } from "@nexusworld3d/engine-server";
import {
  WorldResourceNodeEvents,
  type WorldResourceNodeDeps,
} from "@server/modules/WorldResourceNodeEvents";

/**
 * ES: Recolección en nodos del mapa (`world:harvest-node`). EN: Map resource node harvesting.
 */
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
