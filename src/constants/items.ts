import { ItemType, ItemRarity, InventoryItem } from '@/types/inventory.types';

export interface ItemSpawnConfig {
  id: string; // spawn id
  mapId: string;
  position: { x: number; y: number; z: number };
  item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
}

export const ITEM_SPAWNS: Record<string, ItemSpawnConfig[]> = {
  exterior: [
    {
      id: 'spawn_coin_1',
      mapId: 'exterior',
      position: { x: 5, y: 1, z: 5 },
      item: {
        itemId: 'coin_gold',
        name: 'Moneda de Oro',
        description: 'Una moneda de oro brillante',
        type: 'misc' as ItemType,
        rarity: 'common' as ItemRarity,
        quantity: 1,
        maxStack: 999,
        weight: 0.01,
        level: 1,
        icon: '🪙'
      }
    },
    {
      id: 'spawn_potion_1',
      mapId: 'exterior',
      position: {x: -12.1, y: 1.0, z: 27.1},
      item: {
        itemId: 'potion_health',
        name: 'Poción de Vida',
        description: 'Restaura 50 puntos de vida',
        type: 'consumable' as ItemType,
        rarity: 'common' as ItemRarity,
        quantity: 1,
        maxStack: 10,
        weight: 0.5,
        stats: { health: 50 },
        level: 1,
        icon: '🧪'
      }
    },
  ],
  'hotel-interior': [
    {
      id: 'spawn_sword_1',
      mapId: 'hotel-interior',
      position: { x: 2, y: 1, z: 6 },
      item: {
        itemId: 'sword_iron',
        name: 'Espada de Hierro',
        description: 'Una espada de hierro afilada',
        type: 'weapon' as ItemType,
        rarity: 'uncommon' as ItemRarity,
        quantity: 1,
        maxStack: 1,
        weight: 4.0,
        stats: { damage: 15, strength: 3 },
        level: 2,
        icon: '⚔️'
      }
    }
  ]
};


