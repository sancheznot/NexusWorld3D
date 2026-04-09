/**
 * ES: Puntos de interacción in-world para comprar/ver lotes (Fase 4). Ajustar coords con la ciudad.
 * EN: In-world interaction points for plot purchase/view — tune coords with city art.
 */

import type { TriggerZoneData } from "@/types/trigger.types";

export type HousingPlotTriggerDef = {
  /** ES: Id único del trigger. EN: Unique trigger id. */
  id: string;
  /** ES: Debe coincidir con `HOUSING_PLOTS[].id`. EN: Must match `HOUSING_PLOTS[].id`. */
  plotId: string;
  mapId: string;
  position: { x: number; y: number; z: number };
  radius: number;
};

/**
 * ES: Cartel / zona frente al lote A1 (lado oeste, fuera del rectángulo build).
 * EN: Sign zone west of plot A1 (outside build rectangle).
 */
export const HOUSING_PLOT_TRIGGERS: HousingPlotTriggerDef[] = [
  {
    id: "housing_sign_exterior_lot_a1",
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    position: { x: 45.5, y: 0.6, z: -11 },
    radius: 2.5,
  },
];

export function housingPlotTriggerToZone(def: HousingPlotTriggerDef): TriggerZoneData {
  return {
    id: def.id,
    kind: "housing_plot",
    name: "Lote A1 — comprar / ver / Buy plot",
    position: def.position,
    radius: def.radius,
    data: { plotId: def.plotId },
  };
}
