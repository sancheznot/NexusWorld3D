/**
 * ES: Contratos del core para recursos del framework (servidor).
 * EN: Core contracts for framework resources (server).
 */

import type { NexusWorldRoom } from "@server/rooms/NexusWorldRoom";
import type { EconomyEvents } from "@resources/economy/server/EconomyEvents";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";

/**
 * ES: Servicios registrados por recursos (orden: economía → inventario → …).
 * EN: Services registered by resources (order: economy → inventory → …).
 */
export interface FrameworkServices {
  economy?: EconomyEvents;
  inventory?: InventoryEvents;
}

/**
 * ES: Lo que el core expone al registrar un recurso (sala + ciclo de vida + servicios).
 * EN: What the core exposes when a resource registers (room + lifecycle + services).
 */
export interface CoreContext {
  room: NexusWorldRoom;

  registerDisposable: (dispose: () => void) => void;

  /** ES: Bolsa mutable rellenada por recursos core (economía, inventario, …). EN: Mutable bag filled by core resources. */
  services: FrameworkServices;
}

/** ES: Punto de entrada de un recurso servidor. EN: Server resource entrypoint. */
export type RegisterServerResource = (ctx: CoreContext) => void;
