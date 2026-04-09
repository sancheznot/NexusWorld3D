import { WorldMessages } from "@nexusworld3d/protocol";
import { colyseusClient } from "@/lib/colyseus/client";

export type TreeSyncPayload = {
  mapId: string;
  treeId: string;
  state: "active" | "stump";
  respawnAt?: number;
};

export type TreeStrike = { x: number; y: number; z: number };

/**
 * ES: Intento de talar — `strike` requerido para ct_*; `clientPlayerPos` ayuda si el servidor va atrasado.
 * EN: Chop; `strike` required for ct_*; optional client pos when server position lags.
 */
export function sendTreeChopAttempt(
  treeId: string,
  strike?: TreeStrike,
  clientPlayerPos?: TreeStrike
): void {
  if (!colyseusClient.isConnectedToWorldRoom()) return;
  const payload: {
    treeId: string;
    strike?: TreeStrike;
    clientPlayerPos?: TreeStrike;
  } = { treeId };
  if (strike) payload.strike = strike;
  if (clientPlayerPos) payload.clientPlayerPos = clientPlayerPos;
  colyseusClient.getSocket()?.send(WorldMessages.TreeChop, payload);
}
