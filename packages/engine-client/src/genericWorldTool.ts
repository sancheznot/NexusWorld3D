import { WorldMessages } from "@nexusworld3d/protocol";

/**
 * ES: Envía `WorldMessages.GenericTool` (ver `registerWorldTool` en engine-server).
 * EN: Sends `WorldMessages.GenericTool` (see `registerWorldTool` on engine-server).
 */
export function sendGenericWorldTool(
  roomSend: (type: string, message: unknown) => void,
  toolId: string,
  extra?: Record<string, unknown>
): void {
  roomSend(WorldMessages.GenericTool, { toolId, ...extra });
}

export type WorldToolRaycastHint = {
  clientTargetUserData?: { key: string; value: string };
};

/**
 * ES: Comprueba `userData` del raycast contra la pista del registro.
 * EN: Match raycast `userData` against registration hint.
 */
export function userDataMatchesWorldToolHint(
  userData: Record<string, unknown> | undefined | null,
  hint: WorldToolRaycastHint
): boolean {
  const t = hint.clientTargetUserData;
  if (!t) return true;
  if (!userData || typeof userData !== "object") return false;
  return userData[t.key] === t.value;
}
