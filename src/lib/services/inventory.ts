import {
  InventoryItem,
  Inventory,
  ItemType,
  ItemRarity,
  ItemStats,
  Equipment,
} from '@/types/inventory.types';
import { 
  INVENTORY_SLOTS, 
  INVENTORY_WEIGHT, 
  INVENTORY_GOLD, 
  INVENTORY_DEBUG 
} from '@/constants';
import { ITEMS_CATALOG } from '@/constants/items';
import { isChopAxeItemId } from '@/constants/choppableTrees';
import { isMinePickaxeItemId } from '@/constants/mineableRocks';
import {
  applyCatalogStackCapsToItems,
  canMergeIntoStack,
  catalogMaxDurability,
  catalogMaxStack,
  coalesceInventoryStacks,
  splitOversizedStacks,
} from '@/lib/inventory/itemStacking';

/**
 * Servicio de Inventario - Gestión de items del jugador
 * Maneja inventario, equipamiento, y operaciones de items
 */

export class InventoryService {
  private inventory: Inventory;
  private equipment: Equipment;
  private playerLevel: number = 1;
  private listeners: Set<() => void> = new Set();
  // Removed unused currentWeight - we calculate it dynamically

  constructor(initialInventory?: Partial<Inventory>, playerLevel: number = 1) {
    this.playerLevel = playerLevel;
    this.inventory = {
      items: [],
      maxSlots: this.calculateMaxSlots(),
      usedSlots: 0,
      gold: INVENTORY_GOLD.STARTING_GOLD,
      maxWeight: this.calculateMaxWeight(),
      currentWeight: 0,
      ...initialInventory
    };
    this.equipment = {};
  }

  // Suscripción a cambios del inventario para que la UI reaccione a eventos externos (Colyseus)
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(): void {
    for (const l of this.listeners) l();
  }

  /**
   * Calcular slots máximos basado en nivel
   */
  private calculateMaxSlots(): number {
    const baseSlots = INVENTORY_SLOTS.BASE_SLOTS;
    const levelBonus = (this.playerLevel - 1) * INVENTORY_SLOTS.SLOTS_PER_LEVEL;
    const totalSlots = baseSlots + levelBonus;
    return Math.min(totalSlots, INVENTORY_SLOTS.ABSOLUTE_MAX_SLOTS);
  }

  /**
   * Calcular peso máximo basado en nivel
   */
  private calculateMaxWeight(): number {
    const baseWeight = INVENTORY_WEIGHT.MIN_WEIGHT;
    const levelBonus = (this.playerLevel - 1) * INVENTORY_WEIGHT.WEIGHT_PER_LEVEL;
    const totalWeight = baseWeight + levelBonus;
    return Math.min(totalWeight, INVENTORY_WEIGHT.ABSOLUTE_MAX_WEIGHT);
  }

  /**
   * ES: Caps desde servidor (RPG nivel + stats). EN: Authoritative caps from RPG sync.
   */
  applyAuthoritativeCarryCaps(level: number, maxWeight: number, maxSlots: number): void {
    this.playerLevel = level;
    this.inventory.maxWeight = maxWeight;
    this.inventory.maxSlots = maxSlots;
    this.emitChange();
  }

  /**
   * Actualizar nivel del jugador
   */
  updatePlayerLevel(newLevel: number): void {
    this.playerLevel = newLevel;
    this.inventory.maxSlots = this.calculateMaxSlots();
    this.inventory.maxWeight = this.calculateMaxWeight();
    this.emitChange();
    
    if (INVENTORY_DEBUG.ENABLE_LOGS) {
      console.log(`📈 Nivel actualizado: ${newLevel}, Slots: ${this.inventory.maxSlots}, Peso: ${this.inventory.maxWeight}`);
    }
  }

  /**
   * Calcular peso total del inventario
   */
  private calculateTotalWeight(): number {
    return this.inventory.items.reduce((total, item) => {
      return total + (item.weight * item.quantity);
    }, 0);
  }

  /**
   * Agregar item al inventario
   */
  addItem(item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>): boolean {
    applyCatalogStackCapsToItems(this.inventory.items);
    coalesceInventoryStacks(this.inventory);
    splitOversizedStacks(this.inventory);

    const catalog = ITEMS_CATALOG[item.itemId];
    const fromPayload =
      typeof item.maxStack === 'number' && item.maxStack > 0
        ? Math.floor(item.maxStack)
        : 0;
    const maxStack = Math.max(catalogMaxStack(item.itemId), fromPayload);

    let maxDurability = item.maxDurability;
    let durability = item.durability;
    const catMd = catalogMaxDurability(item.itemId);
    if (isChopAxeItemId(item.itemId) || isMinePickaxeItemId(item.itemId)) {
      maxDurability = maxDurability ?? 80;
      durability = typeof durability === 'number' ? durability : maxDurability;
    } else if (catMd) {
      maxDurability = maxDurability ?? catMd;
      durability = typeof durability === 'number' ? durability : maxDurability;
    }

    const merged: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'> = {
      ...item,
      name: item.name ?? catalog?.name ?? item.itemId,
      type: (item.type ?? catalog?.type) as ItemType,
      rarity: (item.rarity ?? catalog?.rarity) as ItemRarity,
      weight: item.weight ?? (catalog?.weight ?? 0),
      icon: item.icon ?? (catalog?.icon ?? '❓'),
      thumb: item.thumb ?? catalog?.thumb,
      model: item.model ?? catalog?.visual?.path,
      level: item.level ?? 1,
      quantity: item.quantity ?? 1,
      maxStack,
      description: item.description ?? (catalog?.name ?? item.itemId),
      maxDurability,
      durability,
    };

    const incomingMeta: Pick<InventoryItem, 'itemId' | 'maxDurability' | 'durability'> = {
      itemId: item.itemId,
      maxDurability,
      durability,
    };

    let remaining = Math.max(1, Math.floor(merged.quantity));
    const unitW = merged.weight;

    const roomW = this.inventory.maxWeight - this.calculateTotalWeight();
    if (roomW < unitW) {
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.warn('⚠️ Inventario lleno (peso)');
      }
      return false;
    }
    remaining = Math.min(remaining, Math.floor(roomW / unitW));
    if (remaining <= 0) return false;

    let placedAny = false;
    while (remaining > 0) {
      const existingItem = this.inventory.items.find(
        (invItem) =>
          !invItem.isEquipped &&
          invItem.quantity < invItem.maxStack &&
          canMergeIntoStack(invItem, incomingMeta)
      );

      if (existingItem) {
        const space = existingItem.maxStack - existingItem.quantity;
        const add = Math.min(space, remaining);
        existingItem.quantity += add;
        remaining -= add;
        placedAny = true;
        continue;
      }

      if (this.inventory.items.length >= this.inventory.maxSlots) {
        break;
      }

      const chunk = Math.min(remaining, maxStack);
      const slot = this.findEmptySlot();
      if (slot < 0) break;

      const newItem: InventoryItem = {
        ...merged,
        quantity: chunk,
        id: this.generateItemId(),
        isEquipped: false,
        slot,
        durability,
        maxDurability,
      };

      this.inventory.items.push(newItem);
      remaining -= chunk;
      placedAny = true;
    }

    if (!placedAny) {
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.warn('⚠️ Inventario lleno (slots) o sin espacio');
      }
      return false;
    }

    applyCatalogStackCapsToItems(this.inventory.items);
    coalesceInventoryStacks(this.inventory);
    this.inventory.usedSlots = this.inventory.items.length;
    this.inventory.currentWeight = this.calculateTotalWeight();
    this.emitChange();

    if (INVENTORY_DEBUG.ENABLE_LOGS) {
      console.log(`✅ Item(s) agregado(s): ${merged.name}`);
    }
    return true;
  }

  /**
   * Remover item del inventario
   */
  removeItem(itemId: string, quantity: number = 1): boolean {
    const itemIndex = this.inventory.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      console.warn(`⚠️ Item no encontrado: ${itemId}`);
      return false;
    }

    const item = this.inventory.items[itemIndex];
    
    if (item.quantity <= quantity) {
      // Remover item completamente
      this.inventory.items.splice(itemIndex, 1);
      this.inventory.usedSlots--;
      this.inventory.currentWeight = this.calculateTotalWeight();
      this.emitChange();
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.log(`✅ Item removido completamente: ${item.name}`);
      }
    } else {
      // Reducir cantidad
      item.quantity -= quantity;
      this.inventory.currentWeight = this.calculateTotalWeight();
      this.emitChange();
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.log(`✅ Item reducido: ${item.name} (-${quantity})`);
      }
    }

    return true;
  }

  /**
   * Equipar item
   */
  equipItem(itemId: string): boolean {
    const item = this.inventory.items.find(i => i.id === itemId);
    if (!item) {
      console.warn(`⚠️ Item no encontrado: ${itemId}`);
      return false;
    }

    // Verificar si es equipable
    if (!this.isEquipable(item.type)) {
      console.warn(`⚠️ Item no equipable: ${item.type}`);
      return false;
    }

    this.unequipItem(item.type);
    item.isEquipped = true;
    this.syncEquipmentFromInventoryItems();
    this.emitChange();

    console.log(`✅ Item equipado: ${item.name}`);
    return true;
  }

  /**
   * Desequipar item
   */
  unequipItem(itemType: ItemType): boolean {
    const equippedItem = this.inventory.items.find(
      (i) => i.type === itemType && i.isEquipped
    );
    if (!equippedItem) {
      return false;
    }

    equippedItem.isEquipped = false;
    this.syncEquipmentFromInventoryItems();
    this.emitChange();

    console.log(`✅ Item desequipado: ${equippedItem.name}`);
    return true;
  }

  /**
   * Usar item consumible
   */
  useItem(itemId: string): boolean {
    const item = this.inventory.items.find(i => i.id === itemId);
    if (!item) {
      console.warn(`⚠️ Item no encontrado: ${itemId}`);
      return false;
    }

    if (item.type !== 'consumable') {
      console.warn(`⚠️ Item no consumible: ${item.type}`);
      return false;
    }

    // Aplicar efectos del item
    this.applyItemEffects(item);

    // Remover item del inventario
    this.removeItem(itemId, 1);
    
    console.log(`✅ Item usado: ${item.name}`);
    return true;
  }

  /**
   * Obtener inventario completo
   */
  getInventory(): Inventory {
    return { ...this.inventory };
  }

  /**
   * Reemplazar inventario completo desde snapshot del servidor
   */
  setInventorySnapshot(inventory: Inventory): void {
    this.inventory = {
      ...inventory,
      items: inventory.items.map((i) => ({ ...i })),
    };
    this.inventory.usedSlots = this.inventory.items.length;
    this.inventory.currentWeight = this.calculateTotalWeight();
    this.syncEquipmentFromInventoryItems();
    this.emitChange();
  }

  /**
   * ES: Aplica un ítem devuelto por Colyseus (`inventory:item-equipped` / `unequipped`) sin snapshot completo.
   * EN: Merge single item from server equip broadcasts.
   */
  applyInventoryItemPatch(item: InventoryItem): void {
    const idx = this.inventory.items.findIndex((i) => i.id === item.id);
    if (idx === -1) return;
    this.inventory.items[idx] = { ...this.inventory.items[idx], ...item };
    this.inventory.currentWeight = this.calculateTotalWeight();
    this.syncEquipmentFromInventoryItems();
    this.emitChange();
  }

  /** ES: `equipment.*` coherente con `items[].isEquipped` (evita refs huérfanas tras `inventory:updated`). */
  private syncEquipmentFromInventoryItems(): void {
    const next: Equipment = {};
    for (const item of this.inventory.items) {
      if (!item.isEquipped) continue;
      if (!this.isEquipable(item.type)) continue;
      const key = this.getEquipmentSlot(item.type);
      next[key] = item;
    }
    this.equipment = next;
  }

  /**
   * Obtener equipamiento
   */
  getEquipment(): Equipment {
    return { ...this.equipment };
  }

  /**
   * Obtener items por tipo
   */
  getItemsByType(type: ItemType): InventoryItem[] {
    return this.inventory.items.filter(item => item.type === type);
  }

  /**
   * Obtener items por rareza
   */
  getItemsByRarity(rarity: ItemRarity): InventoryItem[] {
    return this.inventory.items.filter(item => item.rarity === rarity);
  }

  /**
   * Buscar item por nombre
   */
  findItemByName(name: string): InventoryItem | undefined {
    return this.inventory.items.find(item => 
      item.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Verificar si hay espacio en inventario
   */
  hasSpace(): boolean {
    return this.inventory.usedSlots < this.inventory.maxSlots;
  }

  /**
   * Verificar si el inventario está bloqueado por peso
   */
  isWeightBlocked(): boolean {
    const currentWeight = this.calculateTotalWeight();
    return currentWeight >= this.inventory.maxWeight;
  }

  /**
   * Obtener porcentaje de peso usado
   */
  getWeightPercentage(): number {
    const currentWeight = this.calculateTotalWeight();
    return (currentWeight / this.inventory.maxWeight) * 100;
  }

  /**
   * Obtener estadísticas totales del equipamiento
   */
  getTotalStats(): ItemStats {
    const totalStats: ItemStats = {};
    
    Object.values(this.equipment).forEach(item => {
      if (item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          if (typeof value === 'number' && value > 0) {
            const currentValue = totalStats[stat as keyof ItemStats] || 0;
            totalStats[stat as keyof ItemStats] = currentValue + value;
          }
        });
      }
    });

    return totalStats;
  }

  /**
   * Agregar oro
   */
  addGold(amount: number): void {
    this.inventory.gold += amount;
    console.log(`💰 Oro agregado: +${amount} (Total: ${this.inventory.gold})`);
    this.emitChange();
  }

  /**
   * Subir de nivel (para testing)
   */
  levelUp(): void {
    this.updatePlayerLevel(this.playerLevel + 1);
    console.log(`🎉 ¡Subiste al nivel ${this.playerLevel}!`);
    console.log(`📦 Nuevos slots: ${this.inventory.maxSlots}`);
    console.log(`⚖️ Nuevo peso máximo: ${this.inventory.maxWeight} kg`);
  }

  /**
   * Remover oro
   */
  removeGold(amount: number): boolean {
    if (this.inventory.gold < amount) {
      console.warn(`⚠️ Oro insuficiente: ${this.inventory.gold}/${amount}`);
      return false;
    }
    
    this.inventory.gold -= amount;
    console.log(`💰 Oro removido: -${amount} (Total: ${this.inventory.gold})`);
    this.emitChange();
    return true;
  }

  // Métodos privados

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findEmptySlot(): number {
    const usedSlots = this.inventory.items.map(item => item.slot).filter(slot => slot !== undefined);
    for (let i = 0; i < this.inventory.maxSlots; i++) {
      if (!usedSlots.includes(i)) {
        return i;
      }
    }
    return -1; // No hay slots disponibles
  }

  private isEquipable(itemType: ItemType): boolean {
    const equipableTypes: ItemType[] = ['weapon', 'armor', 'tool'];
    return equipableTypes.includes(itemType);
  }

  private getEquipmentSlot(itemType: ItemType): keyof Equipment {
    const slotMap: Record<ItemType, keyof Equipment> = {
      'weapon': 'weapon',
      'armor': 'chestplate', // Por defecto, se puede mejorar
      'tool': 'weapon',
      'consumable': 'weapon', // No equipable
      'quest': 'weapon', // No equipable
      'material': 'weapon', // No equipable
      'misc': 'weapon' // No equipable
    };
    return slotMap[itemType];
  }

  private applyItemEffects(item: InventoryItem): void {
    // Aquí se aplicarían los efectos del item
    // Por ejemplo: curar vida, restaurar stamina, etc.
    console.log(`🍎 Aplicando efectos de: ${item.name}`);
    
    if (item.stats) {
      // Aplicar estadísticas temporales o permanentes
      console.log('📊 Efectos aplicados:', item.stats);
    }
  }
}

// Instancia global del servicio
export const inventoryService = new InventoryService();

// Items predefinidos para testing
export const DEFAULT_ITEMS: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>[] = [
  {
    itemId: 'sword_basic',
    name: 'Espada Básica',
    description: 'Una espada simple pero efectiva',
    type: 'weapon',
    rarity: 'common',
    quantity: 1,
    maxStack: 1,
    weight: 3.5, // Peso de la espada
    stats: { damage: 10, strength: 2 },
    level: 1,
    icon: '⚔️'
  },
  {
    itemId: 'potion_health',
    name: 'Poción de Vida',
    description: 'Restaura 50 puntos de vida',
    type: 'consumable',
    rarity: 'common',
    quantity: 5,
    maxStack: 10,
    weight: 0.5, // Peso de la poción
    stats: { health: 50 },
    level: 1,
    icon: '🧪'
  },
  {
    itemId: 'armor_leather',
    name: 'Armadura de Cuero',
    description: 'Protección básica de cuero',
    type: 'armor',
    rarity: 'common',
    quantity: 1,
    maxStack: 1,
    weight: 8.0, // Peso de la armadura
    stats: { defense: 5, vitality: 1 },
    level: 1,
    icon: '🛡️'
  },
  {
    itemId: 'gold_coin',
    name: 'Moneda de Oro',
    description: 'Moneda de oro valiosa',
    type: 'misc',
    rarity: 'common',
    quantity: 100,
    maxStack: 999,
    weight: 0.01, // Peso de la moneda
    level: 1,
    icon: '🪙'
  }
];
