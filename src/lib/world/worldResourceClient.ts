import { colyseusClient } from "@/lib/colyseus/client";

/** ES: Solicita recolección en un nodo de mapa (validación en servidor). EN: Request harvest at world node. */
export function harvestWorldResourceNode(nodeId: string): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send("world:harvest-node", { nodeId });
}
