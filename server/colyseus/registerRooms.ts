/**
 * ES: Registra la sala canónica de Colyseus y alias legacy (misma clase Room).
 * EN: Registers the canonical Colyseus room plus legacy aliases (same Room class).
 */

import type { Server } from "colyseus";
import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";
import { NexusLobbyRoom } from "@server/rooms/NexusLobbyRoom";
import { NexusWorldRoom } from "@server/rooms/NexusWorldRoom";

export function registerNexusWorldRooms(gameServer: Server): void {
  const lobbyName = nexusWorld3DConfig.networking.colyseusLobbyRoomName;
  gameServer.define(lobbyName, NexusLobbyRoom).enableRealtimeListing();

  const primary = nexusWorld3DConfig.networking.colyseusRoomName;
  const legacy = nexusWorld3DConfig.networking.colyseusLegacyRoomNames.filter(
    (name) => name && name !== primary
  );

  // ES: enableRealtimeListing solo en la sala canónica (matchmaking).
  // EN: enableRealtimeListing only on canonical room (matchmaking).
  gameServer.define(primary, NexusWorldRoom).enableRealtimeListing();
  for (const roomName of legacy) {
    gameServer.define(roomName, NexusWorldRoom);
  }
}
