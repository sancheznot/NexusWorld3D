/**
 * ES: Recurso economía — billetera, banco, transferencias.
 * EN: Economy resource — wallet, bank, transfers.
 */

import type { RegisterServerResource } from "@resources/types";
import { EconomyEvents } from "@resources/economy/server/EconomyEvents";

export const registerEconomyResource: RegisterServerResource = (ctx) => {
  const economy = new EconomyEvents(ctx.room);
  ctx.services.economy = economy;
};
