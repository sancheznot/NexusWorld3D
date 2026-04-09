/**
 * ES: Escombros por plantilla en parcela (Fase 5). IDs estables para persistencia.
 * EN: Plot debris templates (Phase 5). Stable ids for persistence.
 */

export type PlotDebrisKind = "rock" | "brush";

export type PlotDebrisReward = { itemId: string; quantity: number };

export type PlotDebrisTemplateItem = {
  id: string;
  plotId: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  kind: PlotDebrisKind;
  reward: PlotDebrisReward[];
};

export const PLOT_DEBRIS_TEMPLATES: PlotDebrisTemplateItem[] = [
  {
    id: "exterior_lot_a1_debris_0",
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 52,
    y: 0.35,
    z: -10,
    kind: "rock",
    reward: [{ itemId: "material_stone_raw", quantity: 1 }],
  },
  {
    id: "exterior_lot_a1_debris_1",
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 56,
    y: 0.3,
    z: -14,
    kind: "rock",
    reward: [{ itemId: "material_stone_raw", quantity: 1 }],
  },
  {
    id: "exterior_lot_a1_debris_2",
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 50,
    y: 0.25,
    z: -8,
    kind: "brush",
    reward: [{ itemId: "material_wood_log", quantity: 1 }],
  },
  {
    id: "exterior_lot_a1_debris_3",
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 58,
    y: 0.28,
    z: -7,
    kind: "brush",
    reward: [{ itemId: "material_wood_log", quantity: 1 }],
  },
  {
    id: "exterior_lot_a1_debris_4",
    plotId: "exterior_lot_a1",
    mapId: "exterior",
    x: 54,
    y: 0.32,
    z: -16,
    kind: "rock",
    reward: [{ itemId: "material_stone_raw", quantity: 2 }],
  },
];

const byId = new Map(PLOT_DEBRIS_TEMPLATES.map((d) => [d.id, d]));

export function findPlotDebrisTemplateItem(
  debrisId: string
): PlotDebrisTemplateItem | undefined {
  return byId.get(debrisId);
}

export function getDebrisTemplateForPlot(
  plotId: string
): PlotDebrisTemplateItem[] {
  return PLOT_DEBRIS_TEMPLATES.filter((d) => d.plotId === plotId);
}

export function isKnownPlotDebrisId(debrisId: string): boolean {
  return byId.has(debrisId);
}
