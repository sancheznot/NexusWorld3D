/**
 * ES: Recurso tiempo — día/noche y broadcasts al cliente.
 * EN: Time resource — day/night and client broadcasts.
 */

import type { RegisterServerResource } from "@resources/types";
import { TimeEvents } from "@resources/time/server/TimeEvents";

export const registerTimeResource: RegisterServerResource = (ctx) => {
  const timeEvents = new TimeEvents(ctx.room);
  ctx.registerDisposable(() => timeEvents.dispose());
};
