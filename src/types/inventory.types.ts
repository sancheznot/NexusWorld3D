export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  quantity: number;
  maxStack: number;
  weight: number; // Peso del item
  stats?: ItemStats;
  durability?: number;
  maxDurability?: number;
  level: number;
  icon: string;
  model?: string;
  isEquipped: boolean;
  slot?: number;
}

export type ItemType = 
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'quest'
  | 'material'
  | 'tool'
  | 'misc';

export type ItemRarity = 
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export interface ItemStats {
  strength?: number;
  agility?: number;
  intelligence?: number;
  vitality?: number;
  luck?: number;
  damage?: number;
  defense?: number;
  health?: number;
  stamina?: number;
  mana?: number;
}

export interface Inventory {
  items: InventoryItem[];
  maxSlots: number;
  usedSlots: number;
  gold: number;
  maxWeight: number; // Peso máximo del inventario
  currentWeight: number; // Peso actual del inventario
}

export interface InventorySlot {
  index: number;
  item: InventoryItem | null;
  isEmpty: boolean;
}

export interface Equipment {
  helmet?: InventoryItem;
  chestplate?: InventoryItem;
  leggings?: InventoryItem;
  boots?: InventoryItem;
  weapon?: InventoryItem;
  shield?: InventoryItem;
  accessory1?: InventoryItem;
  accessory2?: InventoryItem;
}
