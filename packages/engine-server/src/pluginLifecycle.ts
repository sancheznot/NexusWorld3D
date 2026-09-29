export interface PluginMetadata {
  readonly id: string;
  /** Optional for compatibility with existing plugins; new plugins should declare it. */
  readonly version?: string;
  /** Required IDs in this installation batch, not npm version ranges. */
  readonly requires?: readonly string[];
}
export interface RuntimePlugin<Context> extends PluginMetadata {
  /** On failure, setup must clean its own incomplete allocation before throwing. */
  setup(context: Context): void | (() => void);
}
export class PluginCleanupError extends Error {
  constructor(public readonly errors: unknown[]) {
    super('Plugin cleanup failed');
    this.name = 'PluginCleanupError';
  }
}

/** Validate the entire graph before any side effects, then mount dependencies first. */
export function installRuntimePlugins<Context>(context: Context, plugins: readonly RuntimePlugin<Context>[]): () => void {
  const byId = new Map<string, RuntimePlugin<Context>>();
  for (const plugin of plugins) {
    if (!plugin.id.trim() || plugin.id !== plugin.id.trim()) throw new Error('Invalid plugin ID');
    if (byId.has(plugin.id)) throw new Error(`Duplicate plugin: ${plugin.id}`);
    if (plugin.version !== undefined && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(plugin.version)) throw new Error(`Invalid plugin version: ${plugin.id}`);
    byId.set(plugin.id, plugin);
  }
  const ordered: RuntimePlugin<Context>[] = [];
  const visited = new Set<string>(), active = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (active.has(id)) throw new Error(`Plugin dependency cycle: ${id}`);
    const plugin = byId.get(id);
    if (!plugin) throw new Error(`Missing plugin dependency: ${id}`);
    active.add(id);
    for (const dependency of plugin.requires ?? []) visit(dependency);
    active.delete(id); visited.add(id); ordered.push(plugin);
  };
  for (const plugin of plugins) visit(plugin.id);
  const cleanups: Array<() => void> = [];
  const dispose = () => {
    const errors: unknown[] = [];
    for (const cleanup of cleanups.splice(0).reverse()) {
      try { cleanup(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new PluginCleanupError(errors);
  };
  try {
    for (const plugin of ordered) {
      const cleanup = plugin.setup(context);
      if (cleanup) cleanups.push(cleanup);
    }
  } catch (error) {
    try { dispose(); } catch (cleanupError) { throw new PluginCleanupError([error, cleanupError]); }
    throw error;
  }
  return dispose;
}
