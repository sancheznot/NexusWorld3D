import { InventoryItem } from '@/types/inventory.types';

export type ShopId = 'general_store' | 'blacksmith' | 'hospital' | 'vip_market' | 'supermarket_store';

export interface ShopItem {
  itemId: string; // reference to ITEMS_CATALOG
  price: number; // major units
  stock?: number; // undefined => infinite
  minLevel?: number;
}

export interface ShopConfig {
  id: ShopId;
  name: string;
  mapId: string; // where the NPC lives
  exclusive?: {
    role?: 'admin' | 'vip' | 'police' | 'medic';
    time?: { fromHour: number; toHour: number }; // 0-23
  };
  items: ShopItem[];
}

export const SHOPS: Record<ShopId, ShopConfig> = {
  general_store: {
    id: 'general_store',
    name: 'Tienda General',
    mapId: 'exterior',
    items: [
      { itemId: 'coin_gold', price: 50, stock: 100 },
      { itemId: 'potion_health', price: 30, stock: 20 },
    ],
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Herrería',
    mapId: 'hotel-interior',
    items: [
      { itemId: 'sword_iron', price: 250, stock: 5, minLevel: 2 },
    ],
  },
  hospital: {
    id: 'hospital',
    name: 'Botica del Hospital',
    mapId: 'hospital',
    items: [
      { itemId: 'potion_health', price: 25, stock: 50 },
    ],
  },
  vip_market: {
    id: 'vip_market',
    name: 'Mercado VIP',
    mapId: 'exterior',
    exclusive: { role: 'vip' },
    items: [
      { itemId: 'coin_gold', price: 45, stock: 100 },
    ],
  },
  // Tienda del supermercado
  supermarket_store: {
    id: 'supermarket_store',
    name: 'Supermercado Central',
    mapId: 'supermarket',
    items: [
      { itemId: 'coin_gold', price: 45, stock: 200 },
      { itemId: 'potion_health', price: 28, stock: 80 },
    ],
  },
};


