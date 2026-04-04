/**
 * ES: Recurso inventario — depende de economía.
 * EN: Inventory resource — depends on economy.
 */

import type { RegisterServerResource } from "@resources/types";
import { InventoryEvents } from "@resources/inventory/server/InventoryEvents";

export const registerInventoryResource: RegisterServerResource = (ctx) => {
  const economy = ctx.services.economy;
  if (!economy) {
    throw new Error(
      "[NexusWorld3D] inventory resource requires economy to be registered first"
    );
  }
  const inventory = new InventoryEvents(ctx.room, economy);
  ctx.services.inventory = inventory;
};
