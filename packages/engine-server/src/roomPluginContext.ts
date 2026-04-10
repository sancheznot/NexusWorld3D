import type { Room } from "colyseus";

/**
 * ES: Contexto mínimo que la sala inyecta en plugins — amplía en tu juego (inventario tipado, etc.).
 * EN: Minimal context the room passes into plugins; extend in your game (typed inventory, etc.).
 */
export interface FrameworkRoomPluginContext {
  getPlayerPosition: (
    sessionId: string
  ) => { x: number; y: number; z: number } | null;
}

/**
 * ES: Variante de plugin que recibe `ctx` en `attach` (patrón recomendado para código nuevo).
 * EN: Plugin variant that receives `ctx` at attach time (preferred for new code).
 */
export interface NexusContextRoomPlugin {
  readonly id: string;
  attach(room: Room, ctx: FrameworkRoomPluginContext): void;
}

export function attachContextRoomPlugins(
  room: Room,
  ctx: FrameworkRoomPluginContext,
  plugins: NexusContextRoomPlugin[]
): void {
  for (const p of plugins) {
    p.attach(room, ctx);
  }
}
