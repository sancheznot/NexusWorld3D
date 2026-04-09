/**
 * ES: Árboles talables — misma fuente en cliente (visual + raycast) y servidor (validación).
 * EN: Choppable trees — shared client/server definitions.
 */

export interface ChoppableTreeDef {
  id: string;
  mapId: string;
  position: { x: number; y: number; z: number };
  /** Golpes de hacha necesarios para derribar (resistencia del árbol). */
  maxHits: number;
  /**
   * ES: Solo props explícitos en escena con `userData.choppableProp` (no mallas incrustadas en city.glb).
   * EN: Explicit scene props only; embedded map geometry must stay false / untagged.
   */
  canChopProp?: boolean;
  /** @deprecated Los troncos por golpe usan `rollWoodLogsPerChopHit` según el hacha. */
  logReward?: number;
  /** Radio del tronco (visual + hit) */
  trunkRadius?: number;
  /** Altura aproximada del follaje (visual) */
  crownHeight?: number;
}

/**
 * ES: Troncos aleatorios por cada golpe según `itemId` del hacha (extensible a hacha_2, etc.).
 * EN: Random logs per swing by axe catalog id.
 */
export const AXE_WOOD_PER_HIT_BY_TOOL: Record<string, { min: number; max: number }> = {
  tool_axe: { min: 2, max: 4 },
};

export function rollWoodLogsPerChopHit(toolItemId: string): number {
  const tier = AXE_WOOD_PER_HIT_BY_TOOL[toolItemId] ?? { min: 1, max: 3 };
  return (
    Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min
  );
}

/** ES: Ítem de hacha válido para talar. EN: Catalog ids treated as chop axes. */
export function isChopAxeItemId(itemId: string): boolean {
  return itemId === "tool_axe" || itemId.startsWith("tool_axe_");
}

/** Zona de prueba cerca de los spawns de ítems (~ -13, 28). */
export const CHOPPABLE_TREES: ChoppableTreeDef[] = [
  {
    id: "ext_chop_tree_1",
    mapId: "exterior",
    position: { x: -14.5, y: 1.0, z: 25.5 },
    maxHits: 10,
    canChopProp: true,
    logReward: 3,
    trunkRadius: 0.35,
    crownHeight: 3.2,
  },
  {
    id: "ext_chop_tree_2",
    mapId: "exterior",
    position: { x: -15.8, y: 1.0, z: 27.2 },
    maxHits: 10,
    canChopProp: true,
    logReward: 4,
    trunkRadius: 0.38,
    crownHeight: 3.5,
  },
  {
    id: "ext_chop_tree_3",
    mapId: "exterior",
    position: { x: -13.0, y: 1.0, z: 24.0 },
    maxHits: 10,
    canChopProp: true,
    logReward: 2,
    trunkRadius: 0.32,
    crownHeight: 2.8,
  },
];

export const TREE_CHOP_MAX_DISTANCE = 3.8;

export const TREE_RESPAWN_MS = 50_000;

/** ES: Árboles del city.glb (prefijo ct_). EN: City GLB trees use ct_ ids. */
export const CITY_TREE_CHOP_PREFIX = "ct_";
export const CITY_TREE_MAX_HITS = 6;
export const CITY_TREE_LOG_REWARD = 2;
/**
 * ES: Máx. distancia horizontal jugador↔punto de raycast (copas altas / desync servidor).
 * EN: Max horizontal dist player↔strike (tall canopies / server pos lag).
 */
export const CITY_STRIKE_MAX_DIST_FROM_PLAYER = 22;
/** ES: Si el cliente envía posición y está cerca de la del servidor, usamos la del cliente. */
export const CLIENT_POS_TRUST_RADIUS = 28;

export function getChoppableTreeDef(
  treeId: string
): ChoppableTreeDef | undefined {
  return CHOPPABLE_TREES.find(
    (t) => t.id === treeId && t.canChopProp !== false
  );
}

/** ES: Árboles talables registrados como props (servidor). EN: Server-side prop tree list. */
export const CHOPPABLE_PROP_TREES = CHOPPABLE_TREES.filter(
  (t) => t.canChopProp !== false
);
