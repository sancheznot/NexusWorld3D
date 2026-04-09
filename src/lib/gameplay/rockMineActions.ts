import { colyseusClient } from '@/lib/colyseus/client';

export type RockSyncPayload = {
  mapId: string;
  rockId: string;
  state: 'active' | 'rubble';
  respawnAt?: number;
};

export function sendRockMineAttempt(
  rockId: string,
  clientPlayerPos?: { x: number; y: number; z: number }
): void {
  if (!colyseusClient.isConnectedToWorldRoom()) return;
  const payload: {
    rockId: string;
    clientPlayerPos?: { x: number; y: number; z: number };
  } = { rockId };
  if (clientPlayerPos) payload.clientPlayerPos = clientPlayerPos;
  colyseusClient.getSocket()?.send('world:rock-mine', payload);
}
