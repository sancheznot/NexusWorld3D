import type { Room } from "colyseus";
export { createWorldRegistries, type WorldRegistries } from './worldRegistries';
export { createResourceNodeRegistry, type ResourceNodeRegistry } from './resourceNodeRegistry';
export { createItemEffectRegistry, type ItemEffectRegistry } from './itemEffectRegistry';
export { createWorldToolRegistry, type WorldToolRegistry } from './worldToolRegistry';
import { installRuntimePlugins, type PluginMetadata } from './pluginLifecycle';
export { installRuntimePlugins, PluginCleanupError, type PluginMetadata, type RuntimePlugin } from './pluginLifecycle';

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

export {
  type ItemConsumeEffectContext,
  type ItemConsumeEffect,
  registerItemEffect,
  getItemConsumeEffects,
  clearItemEffectRegistry,
} from "./itemEffectRegistry";

export {
  type WorldToolServerContext,
  type WorldToolClientTargetHint,
  type WorldToolMeta,
  type WorldToolRegistration,
  registerWorldTool,
  getWorldToolMeta,
  getWorldToolHandler,
  getWorldToolClientDescriptors,
  clearWorldToolRegistry,
} from "./worldToolRegistry";

export {
  type WorldToolInventoryGate,
  attachGenericWorldToolRouter,
} from "./genericWorldToolRouter";

/**
 * ES: Contrato para montar subsistemas en la sala mundo sin acoplar la clase de la sala.
 * EN: Contract to attach subsystems to the world room without hard-wiring the room class.
 *
 * Plugins del núcleo: id `core:*`; juegos privados: `game:*` (convención).
 */
export interface NexusRoomPlugin extends PluginMetadata {
  attach(room: Room): void | (() => void);
}

export function attachNexusRoomPlugins(
  room: Room,
  plugins: NexusRoomPlugin[]
): () => void {
  return installRuntimePlugins(room, plugins.map(plugin => ({
    id: plugin.id, version: plugin.version, requires: plugin.requires,
    setup: (target: Room) => plugin.attach(target),
  })));
}
