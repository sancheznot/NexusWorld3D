import { ItemType, ItemRarity, InventoryItem } from "@/types/inventory.types";

export interface ItemSpawnConfig {
  id: string; // spawn id
  mapId: string;
  // varios puntos candidatos para aparición; si se provee más de uno, el server elige uno
  points?: Array<{ x: number; y: number; z: number }>;
  position?: { x: number; y: number; z: number }; // compatibilidad
  respawnSec?: number; // tiempo de respawn opcional
  item: Omit<InventoryItem, "id" | "isEquipped" | "slot"> & {
    visual?: {
      path: string; // /models/... .glb
      type: "glb" | "gltf" | "fbx" | "obj";
      scale?: number;
      rotation?: [number, number, number];
    };
  };
}

// Efectos disponibles que aplica el servidor al usar el ítem
export type ItemEffects = {
  gold?: number; // suma oro
  health?: number; // cura vida (por ahora reservado)
  food?: number; // alimento (por ahora reservado)
};

// Catálogo maestro por itemId (fuente de la verdad)
export const ITEMS_CATALOG: Record<
  string,
  {
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    weight: number;
    icon: string;
    thumb?: string; // ruta a PNG pre-generado para UI
    visual?: {
      path: string;
      type: "glb" | "gltf" | "fbx" | "obj";
      scale?: number;
      rotation?: [number, number, number];
    };
    effects?: ItemEffects;
  }
> = {
  coin_gold: {
    name: "Moneda de Oro",
    type: "consumable",
    rarity: "common",
    weight: 0.01,
    icon: "🪙",
    visual: {
      path: "/models/items/consumable/money/moneyBag_withMoney.glb",
      type: "glb",
      scale: 1,
    },
    // Thumbnail pre-generado para UI de inventario
    thumb: "/models/items/consumable/money/icons/moneyBag_withMoney.png",
    effects: { gold: 50 },
  },
  potion_health: {
    name: "Poción de Vida",
    type: "consumable",
    rarity: "common",
    weight: 0.5,
    icon: "🧪",
    visual: {
      path: "/models/terrain/environment/Flower_01.glb",
      type: "gltf",
      scale: 0.8,
    },
    effects: { health: 50 },
  },
  food_apple: {
    name: 'Manzana',
    type: 'consumable',
    rarity: 'common',
    weight: 0.2,
    icon: '🍎',
    visual: { path: '/models/terrain/environment/Plant_02.glb', type: 'gltf', scale: 0.6 },
    effects: { health: 5 }
  },
};

export const ITEM_SPAWNS: Record<string, ItemSpawnConfig[]> = {
  exterior: [
    {
      id: "spawn_coin_gold",
      mapId: "exterior",
      // Fijamos posición exacta para test (antes: points aleatorios)
      position: { x: -13.1, y: 1.0, z: 27.9 },
      respawnSec: 10,
      item: {
        itemId: "coin_gold",
        quantity: 1,
        maxStack: 999,
        level: 1,
        weight: 0.01,
        name: "Moneda de Oro",
        description: "Voucher de oro",
        type: "consumable" as ItemType,
        rarity: "common" as ItemRarity,
        icon: "🪙",
      },
    },
    {
      id: "spawn_potion_health",
      mapId: "exterior",
      position: { x: -12.1, y: 1.0, z: 27.1 },
      respawnSec: 90,
      item: {
        itemId: "potion_health",
        quantity: 1,
        maxStack: 10,
        level: 1,
        weight: 0.5,
        name: "Poción de Vida",
        description: "Restaura la salud",
        type: "consumable" as ItemType,
        rarity: "common" as ItemRarity,
        icon: "🧪",
      },
    },
  ],
  "hotel-interior": [
    {
      id: "spawn_sword_1",
      mapId: "hotel-interior",
      position: { x: 2, y: 1, z: 6 },
      item: {
        itemId: "sword_iron",
        name: "Espada de Hierro",
        description: "Una espada de hierro afilada",
        type: "weapon" as ItemType,
        rarity: "uncommon" as ItemRarity,
        quantity: 1,
        maxStack: 1,
        weight: 4.0,
        stats: { damage: 15, strength: 3 },
        level: 2,
        icon: "⚔️",
      },
    },
  ],
};
