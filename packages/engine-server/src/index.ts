import type { Room } from "colyseus";

export {
  type FrameworkRoomPluginContext,
  type NexusContextRoomPlugin,
  attachContextRoomPlugins,
} from "./roomPluginContext";

export {
  type PlayerSnapshot,
  type WorldPatch,
  type PlayerStore,
  type SessionStore,
  type WorldStateStore,
} from "./persistence";

export {
  createInMemoryPlayerStore,
  createInMemorySessionStore,
  createInMemoryWorldStateStore,
} from "./persistenceMemory";

export {
  type ResourceNodeGrantSpec,
  type ResourceNodeRegistration,
  registerResourceNode,
  getResourceNodeRegistrations,
  getRegisteredResourceNodeById,
  clearResourceNodeRegistry,
} from "./resourceNodeRegistry";

/**
 * ES: Contrato para montar subsistemas en la sala mundo sin acoplar la clase de la sala.
 * EN: Contract to attach subsystems to the world room without hard-wiring the room class.
 *
 * Plugins del núcleo: id `core:*`; juegos privados: `game:*` (convención).
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
