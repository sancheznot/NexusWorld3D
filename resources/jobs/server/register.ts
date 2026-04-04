/**
 * ES: Recurso trabajos — depende de inventario y economía.
 * EN: Jobs resource — depends on inventory and economy.
 */

import type { RegisterServerResource } from "@resources/types";
import { JobsEvents } from "@resources/jobs/server/JobsEvents";

export const registerJobsResource: RegisterServerResource = (ctx) => {
  const { room, services } = ctx;
  const inventory = services.inventory;
  const economy = services.economy;
  if (!inventory || !economy) {
    throw new Error(
      "[NexusWorld3D] jobs resource requires economy and inventory to be registered first"
    );
  }

  new JobsEvents(room, {
    grantItemToPlayer: (playerId, baseItem) =>
      inventory.addItemFromWorld(playerId, baseItem),
    getPlayerMapId: (clientId) => room.getPlayerMapId(clientId),
    getPlayerRole: (clientId) => room.resolvePlayerJobRole(clientId),
    setPlayerRole: (playerId, roleId) =>
      room.assignPlayerJobRole(playerId, roleId),
    economy: {
      creditWalletMajor: (userId, amount, reason) =>
        economy.creditWalletMajor(userId, amount, reason),
    },
  });
};
