/**
 * ES: Registro en proceso para el monitor HTTP — snapshots solo lectura de `NexusWorldRoom`.
 * EN: In-process registry for HTTP monitor — read-only NexusWorldRoom snapshots.
 */

export type NexusWorldRoomInspectPayload = {
  roomName: string;
  clientCount: number;
  players: Array<{
    sessionId: string;
    username: string;
    mapId: string;
    position: { x: number; y: number; z: number };
  }>;
  /** ES: Resumen de escena v0.1 aplicada en memoria (autoría). EN: In-memory applied v0.1 scene summary. */
  sceneAuthoringV0_1: {
    schemaVersion: number;
    worldId: string;
    entityCount: number;
  } | null;
};

const byRoomId = new Map<string, () => NexusWorldRoomInspectPayload>();

export function registerNexusWorldRoomInspect(
  roomId: string,
  getPayload: () => NexusWorldRoomInspectPayload
): void {
  byRoomId.set(roomId, getPayload);
}

export function unregisterNexusWorldRoomInspect(roomId: string): void {
  byRoomId.delete(roomId);
}

export function collectNexusWorldRoomInspectSnapshots(): Array<
  { roomId: string } & NexusWorldRoomInspectPayload
> {
  const out: Array<{ roomId: string } & NexusWorldRoomInspectPayload> = [];
  for (const [roomId, getPayload] of byRoomId) {
    try {
      out.push({ roomId, ...getPayload() });
    } catch {
      /* sala en teardown u otro error */
    }
  }
  return out;
}
