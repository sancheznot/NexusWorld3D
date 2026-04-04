/**
 * ES: Recursos que deben montarse antes de ítems/tiendas (economía → inventario).
 * EN: Resources that must mount before items/shops (economy → inventory).
 */

import type { CoreContext, RegisterServerResource } from "@resources/types";
import { registerEconomyResource } from "@resources/economy/server/register";
import { registerInventoryResource } from "@resources/inventory/server/register";

const CORE_RESOURCES: RegisterServerResource[] = [
  registerEconomyResource,
  registerInventoryResource,
];

export function attachCoreServerResources(ctx: CoreContext): void {
  for (const register of CORE_RESOURCES) {
    register(ctx);
  }
}
