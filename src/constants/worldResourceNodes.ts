/**
 * ES: Nodos de recurso en mapa (Fase 6) — coords ajustables al layout final.
 * EN: World resource nodes (Phase 6) — tune positions when city art is final.
 */

export type WorldResourceNodeGrant = { itemId: string; quantity: number };

export type WorldResourceNodeVisual = "quarry" | "wood_pile";

export type WorldResourceNodeDef = {
  id: string;
  mapId: string;
  position: { x: number; y: number; z: number };
  radius: number;
  labelEs: string;
  labelEn: string;
  visual: WorldResourceNodeVisual;
  /** ES: Entregas por interacción (servidor valida catálogo). EN: Grants per harvest. */
  grants: WorldResourceNodeGrant[];
};

export const WORLD_RESOURCE_NODES: WorldResourceNodeDef[] = [
  {
    id: "exterior_node_quarry_north",
    mapId: "exterior",
    position: { x: 32, y: 0.4, z: -22 },
    radius: 3,
    labelEs: "Cantera — piedra bruta",
    labelEn: "Quarry — raw stone",
    visual: "quarry",
    grants: [{ itemId: "material_stone_raw", quantity: 2 }],
  },
  {
    id: "exterior_node_lumber_scraps_east",
    mapId: "exterior",
    position: { x: 72, y: 0.35, z: 2 },
    radius: 3,
    labelEs: "Restos de obra — troncos",
    labelEn: "Scrap lumber — logs",
    visual: "wood_pile",
    grants: [{ itemId: "material_wood_log", quantity: 2 }],
  },
];

export function getWorldResourceNodeById(
  id: string
): WorldResourceNodeDef | undefined {
  return WORLD_RESOURCE_NODES.find((n) => n.id === id);
}

export function getWorldResourceNodesForMap(
  mapId: string
): WorldResourceNodeDef[] {
  return WORLD_RESOURCE_NODES.filter((n) => n.mapId === mapId);
}
