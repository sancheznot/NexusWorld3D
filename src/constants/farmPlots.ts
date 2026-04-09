/**
 * ES: Huerto en parcela (Fase 7) — slots fijos por plotId; tiempos en servidor.
 * EN: Plot farm (Phase 7) — fixed slots per plotId; server-side timers.
 */

export const FARM_CROP_IDS = ["crop_lettuce"] as const;
export type FarmCropId = (typeof FARM_CROP_IDS)[number];

export type FarmCropDef = {
  id: FarmCropId;
  seedItemId: string;
  growTimeMs: number;
  harvestItemId: string;
  harvestQuantity: number;
};

export const FARM_CROPS: Record<FarmCropId, FarmCropDef> = {
  crop_lettuce: {
    id: "crop_lettuce",
    seedItemId: "seed_lettuce",
    growTimeMs: 90_000,
    harvestItemId: "food_lettuce",
    harvestQuantity: 2,
  },
};

export type FarmSlotTemplate = {
  slotIndex: number;
  plotId: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  radius: number;
};

/** ES: Tres bancales en lote A1 (coords afinables con ciudad). EN: Three beds in plot A1. */
export const FARM_SLOT_TEMPLATES: FarmSlotTemplate[] = [
  {
    slotIndex: 0,
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 51,
    y: 0.15,
    z: -11,
    radius: 2,
  },
  {
    slotIndex: 1,
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 55,
    y: 0.15,
    z: -11,
    radius: 2,
  },
  {
    slotIndex: 2,
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 53,
    y: 0.15,
    z: -15,
    radius: 2,
  },
];

export function isFarmCropId(id: string): id is FarmCropId {
  return (FARM_CROP_IDS as readonly string[]).includes(id);
}

export function getFarmSlotTemplate(
  plotId: string,
  slotIndex: number
): FarmSlotTemplate | undefined {
  return FARM_SLOT_TEMPLATES.find(
    (t) => t.plotId === plotId && t.slotIndex === slotIndex
  );
}

export function listFarmSlotsForOwnedPlot(
  plotId: string | null,
  mapId: string
): FarmSlotTemplate[] {
  if (!plotId) return [];
  return FARM_SLOT_TEMPLATES.filter(
    (t) => t.plotId === plotId && t.mapId === mapId
  );
}
