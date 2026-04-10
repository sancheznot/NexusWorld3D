/**
 * ES: Nodos de recurso en mapa (Fase 6) — coords ajustables al layout final.
 * EN: World resource nodes (Phase 6) — tune positions when city art is final.
 */

import {
  getResourceNodeRegistrations,
  type ResourceNodeRegistration,
} from "@nexusworld3d/engine-server/resource-node-registry";

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

function normalizeVisual(
  v: string | undefined
): WorldResourceNodeVisual {
  return v === "quarry" ? "quarry" : "wood_pile";
}

function registrationToDef(
  r: ResourceNodeRegistration
): WorldResourceNodeDef {
  return {
    id: r.id,
    mapId: r.mapId,
    position: r.position,
    radius: r.radius,
    labelEs: r.labelEs?.trim() || r.id,
    labelEn: r.labelEn?.trim() || r.id,
    visual: normalizeVisual(r.visual),
    grants: r.grants.map((g) => ({
      itemId: g.itemId,
      quantity: Math.max(0, Math.floor(g.quantity)),
    })),
  };
}

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
  const builtin = WORLD_RESOURCE_NODES.find((n) => n.id === id);
  if (builtin) return builtin;
  const reg = getResourceNodeRegistrations().find((n) => n.id === id);
  return reg ? registrationToDef(reg) : undefined;
}

export function getWorldResourceNodesForMap(
  mapId: string
): WorldResourceNodeDef[] {
  const builtins = WORLD_RESOURCE_NODES.filter((n) => n.mapId === mapId);
  const builtinIds = new Set(builtins.map((n) => n.id));
  const extra = getResourceNodeRegistrations()
    .filter((r) => r.mapId === mapId && !builtinIds.has(r.id))
    .map(registrationToDef);
  return [...builtins, ...extra];
}
