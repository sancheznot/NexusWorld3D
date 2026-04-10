import {
  JOIN_OPTION_PROTOCOL_VERSION_KEY,
  PROTOCOL_VERSION,
} from "@nexusworld3d/protocol";

export {
  sendGenericWorldTool,
  userDataMatchesWorldToolHint,
  type WorldToolRaycastHint,
} from "./genericWorldTool";

/**
 * ES: Añade `protocolVersion` a las opciones de join de la sala mundo.
 * EN: Merges Colyseus join options with `protocolVersion` for the world room.
 */
export function withWorldProtocolJoinOptions(
  joinOptions: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...joinOptions,
    [JOIN_OPTION_PROTOCOL_VERSION_KEY]: PROTOCOL_VERSION,
  };
}
