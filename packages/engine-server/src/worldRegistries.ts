import { createResourceNodeRegistry, defaultResourceNodeRegistry } from './resourceNodeRegistry';
import { createItemEffectRegistry, defaultItemEffectRegistry } from './itemEffectRegistry';
import { createWorldToolRegistry, defaultWorldToolRegistry } from './worldToolRegistry';

/** Empty by default. Compatibility opt-in snapshots defaults once, never live fallbacks. */
export function createWorldRegistries({ inheritDefaults = false } = {}) {
  const resources = inheritDefaults ? defaultResourceNodeRegistry.fork() : createResourceNodeRegistry();
  const effects = inheritDefaults ? defaultItemEffectRegistry.fork() : createItemEffectRegistry();
  const tools = inheritDefaults ? defaultWorldToolRegistry.fork() : createWorldToolRegistry();
  return { resources, effects, tools, clear() {
    resources.clearResourceNodeRegistry(); effects.clearItemEffectRegistry(); tools.clearWorldToolRegistry();
  } };
}
export type WorldRegistries = ReturnType<typeof createWorldRegistries>;
