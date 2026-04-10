/**
 * ES: Efectos extra al **usar** consumibles (`registerItemEffect`). Corre al cargar el servidor.
 * EN: Extra **use** effects for consumables. Runs when the game server module loads.
 *
 * ```ts
 * import { registerItemEffect } from "@nexusworld3d/engine-server";
 *
 * registerItemEffect("food_apple", ({ room, playerId }) => {
 *   room.broadcast("game:toast", { playerId, message: "Custom apple hook" });
 * });
 * ```
 */

export {};
