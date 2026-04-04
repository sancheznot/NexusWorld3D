/**
 * ES: Puente sala Colyseus ↔ resources/ del framework.
 * EN: Bridge between Colyseus room and framework resources/.
 */

import type { NexusWorldRoom } from "@server/rooms/NexusWorldRoom";
import type { CoreContext } from "@resources/types";
import { attachCoreServerResources } from "@resources/core-registry.server";
import { attachLateServerResources } from "@resources/registry.server";

function makeContext(room: NexusWorldRoom): CoreContext {
  return {
    room,
    registerDisposable: (dispose) => room.registerResourceDisposable(dispose),
    services: room.frameworkServices,
  };
}

/** ES: Economía + inventario (antes de ItemEvents / ShopEvents). EN: Economy + inventory first. */
export function attachCoreFrameworkResources(room: NexusWorldRoom): void {
  attachCoreServerResources(makeContext(room));
}

/** ES: Tiempo, jobs, ejemplo (después del resto de sistemas en onCreate). EN: Time, jobs, example after onCreate systems. */
export function attachLateFrameworkResources(room: NexusWorldRoom): void {
  attachLateServerResources(makeContext(room));
}
