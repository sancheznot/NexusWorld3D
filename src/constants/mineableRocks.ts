/**
 * ES: Rocas minables — misma fuente cliente (visual + raycast) y servidor (validación).
 * EN: Mineable rocks — shared client/server definitions.
 */

export interface MineableRockDef {
  id: string;
  mapId: string;
  position: { x: number; y: number; z: number };
  /** Golpes de pico necesarios para agotar el nodo. */
  maxHits: number;
  /**
   * ES: Solo props explícitos con `userData.mineableProp`.
   * EN: Explicit scene props only.
   */
  canMineProp?: boolean;
}

/**
 * ES: Piedra bruta aleatoria por golpe según `itemId` del pico.
 * EN: Random raw stone per swing by pickaxe catalog id.
 */
export const PICKAXE_STONE_PER_HIT_BY_TOOL: Record<
  string,
  { min: number; max: number }
> = {
  tool_pickaxe: { min: 1, max: 4 },
};

export function rollStonePerMineHit(toolItemId: string): number {
  const tier = PICKAXE_STONE_PER_HIT_BY_TOOL[toolItemId] ?? { min: 1, max: 3 };
  return Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
}

/** ES: Ítem de pico válido para minar. EN: Catalog ids treated as mining pickaxes. */
export function isMinePickaxeItemId(itemId: string): boolean {
  return itemId === "tool_pickaxe" || itemId.startsWith("tool_pickaxe_");
}

/** Zona de prueba junto a los árboles talables. */
export const MINEABLE_ROCKS: MineableRockDef[] = [
  {
    id: "ext_mine_rock_1",
    mapId: "exterior",
    position: { x: -11.4, y: 1.0, z: 25.8 },
    maxHits: 10,
    canMineProp: true,
  },
  {
    id: "ext_mine_rock_2",
    mapId: "exterior",
    position: { x: -10.1, y: 1.0, z: 24.2 },
    maxHits: 12,
    canMineProp: true,
  },
  {
    id: "ext_mine_rock_3",
    mapId: "exterior",
    position: { x: -9.2, y: 1.0, z: 26.6 },
    maxHits: 10,
    canMineProp: true,
  },
];

export const ROCK_MINE_MAX_DISTANCE = 3.8;

/** ES: Mismo tiempo de reaparición que los tocones de árbol. EN: Match tree stump respawn. */
export const ROCK_RESPAWN_MS = 50_000;

export function getMineableRockDef(
  rockId: string
): MineableRockDef | undefined {
  return MINEABLE_ROCKS.find(
    (r) => r.id === rockId && r.canMineProp !== false
  );
}

export const MINEABLE_PROP_ROCKS = MINEABLE_ROCKS.filter(
  (r) => r.canMineProp !== false
);
