import type { Client, Room } from "colyseus";
import { WorldMessages } from "@nexusworld3d/protocol";
import {
  getWorldToolHandler,
  getWorldToolMeta,
  type WorldToolServerContext,
} from "./worldToolRegistry";

export type WorldToolInventoryGate = (
  playerId: string,
  itemIds: readonly string[]
) => boolean;

/**
 * ES: Enruta `WorldMessages.GenericTool` a `registerWorldTool` handlers.
 * EN: Routes `WorldMessages.GenericTool` to registered world tool handlers.
 */
export function attachGenericWorldToolRouter(
  room: Room,
  gate: WorldToolInventoryGate
): void {
  room.onMessage(
    WorldMessages.GenericTool,
    (client: Client, data: Record<string, unknown>) => {
      const toolId =
        typeof data?.toolId === "string" ? data.toolId.trim() : "";
      if (!toolId) {
        client.send(WorldMessages.GenericToolResult, {
          ok: false,
          toolId: "",
          message: "toolId inválido",
        });
        return;
      }

      const meta = getWorldToolMeta(toolId);
      if (!meta) {
        client.send(WorldMessages.GenericToolResult, {
          ok: false,
          toolId,
          message: "Herramienta desconocida",
        });
        return;
      }

      if (!gate(client.sessionId, meta.itemIds)) {
        client.send(WorldMessages.GenericToolResult, {
          ok: false,
          toolId,
          message: "No tienes la herramienta requerida en el inventario",
        });
        return;
      }

      const fn = getWorldToolHandler(toolId);
      if (!fn) {
        client.send(WorldMessages.GenericToolResult, {
          ok: false,
          toolId,
          message: "Handler no registrado",
        });
        return;
      }

      const ctx: WorldToolServerContext = {
        room,
        client,
        playerId: client.sessionId,
        toolId,
        payload: data,
      };

      try {
        fn(ctx);
      } catch (e) {
        console.warn(`[GenericTool] ${toolId}`, e);
        client.send(WorldMessages.GenericToolResult, {
          ok: false,
          toolId,
          message: "Error al ejecutar la herramienta",
        });
      }
    }
  );
}
