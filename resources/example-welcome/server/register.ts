/**
 * ES: Recurso de ejemplo — demuestra el hook servidor en resources/.
 * EN: Sample resource — demonstrates the server hook under resources/.
 */

import type { RegisterServerResource } from "@resources/types";

export const registerExampleWelcomeServer: RegisterServerResource = (ctx) => {
  const { room } = ctx;
  console.log(
    `[NexusWorld3D] Resource "example-welcome" attached (server, room: ${room.roomId})`
  );
};
