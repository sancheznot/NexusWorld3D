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

  const enableStagingEnv = process.env.NEXUS_ENABLE_STAGING_WORLD_ROOM?.trim().toLowerCase();
  const enableStaging =
    enableStagingEnv === "1" || enableStagingEnv === "true" || enableStagingEnv === "yes";
  const stagingName =
    process.env.NEXUS_STAGING_WORLD_ROOM_NAME?.trim() || "nexus-world-staging";
  if (enableStaging && stagingName && stagingName !== primary && !legacy.includes(stagingName)) {
    gameServer.define(stagingName, NexusWorldRoom);
    console.log(
      `[Colyseus] Staging world room registered: ${stagingName} (set NEXUS_SCENE_AUTHORING_STAGING_ONLY=1 to restrict scene apply/merge to this template)`
    );
  } else if (enableStaging && (stagingName === primary || legacy.includes(stagingName))) {
    console.warn(
      "[Colyseus] NEXUS_ENABLE_STAGING_WORLD_ROOM set but NEXUS_STAGING_WORLD_ROOM_NAME matches primary/legacy; staging define skipped."
    );
  }
}
