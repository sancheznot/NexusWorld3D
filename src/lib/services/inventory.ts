import { InventoryItem, Inventory, ItemType, ItemRarity, ItemStats, Equipment } from '@/types/inventory.types';
import { 
  INVENTORY_SLOTS, 
  INVENTORY_WEIGHT, 
  INVENTORY_GOLD, 
  INVENTORY_DEBUG 
} from '@/constants';

/**
 * Servicio de Inventario - Gestión de items del jugador
 * Maneja inventario, equipamiento, y operaciones de items
 */

export class InventoryService {
  private inventory: Inventory;
  private equipment: Equipment;
  private playerLevel: number = 1;
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
   * Actualizar nivel del jugador
   */
  updatePlayerLevel(newLevel: number): void {
    this.playerLevel = newLevel;
    this.inventory.maxSlots = this.calculateMaxSlots();
    this.inventory.maxWeight = this.calculateMaxWeight();
    
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
   * Verificar si hay espacio en slots
   */
  private hasSlotSpace(): boolean {
    return this.inventory.usedSlots < this.inventory.maxSlots;
  }

  /**
   * Verificar si hay espacio en peso
   */
  private hasWeightSpace(itemWeight: number, quantity: number): boolean {
    const totalWeight = this.calculateTotalWeight() + (itemWeight * quantity);
    return totalWeight <= this.inventory.maxWeight;
  }

  /**
   * Agregar item al inventario
   */
  addItem(item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>): boolean {
    // Verificar si hay espacio en slots
    if (!this.hasSlotSpace()) {
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.warn('⚠️ Inventario lleno (slots)');
      }
      return false;
    }

    // Verificar si hay espacio en peso
    if (!this.hasWeightSpace(item.weight, item.quantity)) {
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.warn('⚠️ Inventario lleno (peso)');
      }
      return false;
    }

    // Buscar si el item ya existe (para stacking)
    const existingItem = this.inventory.items.find(
      invItem => invItem.itemId === item.itemId && invItem.quantity < invItem.maxStack
    );

    if (existingItem) {
      // Stack con item existente
      const canStack = existingItem.quantity + item.quantity <= existingItem.maxStack;
      if (canStack) {
        existingItem.quantity += item.quantity;
        this.inventory.currentWeight = this.calculateTotalWeight();
        if (INVENTORY_DEBUG.ENABLE_LOGS) {
          console.log(`✅ Item agregado al stack: ${item.name} (${item.quantity})`);
        }
        return true;
      }
    }

    // Crear nuevo item
    const newItem: InventoryItem = {
      ...item,
      id: this.generateItemId(),
      isEquipped: false,
      slot: this.findEmptySlot()
    };

    this.inventory.items.push(newItem);
    this.inventory.usedSlots++;
    this.inventory.currentWeight = this.calculateTotalWeight();
    
    if (INVENTORY_DEBUG.ENABLE_LOGS) {
      console.log(`✅ Item agregado: ${item.name} (${item.quantity})`);
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
      if (INVENTORY_DEBUG.ENABLE_LOGS) {
        console.log(`✅ Item removido completamente: ${item.name}`);
      }
    } else {
      // Reducir cantidad
      item.quantity -= quantity;
      this.inventory.currentWeight = this.calculateTotalWeight();
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

    // Desequipar item actual si existe
    this.unequipItem(item.type);

    // Equipar nuevo item
    this.equipment[this.getEquipmentSlot(item.type)] = item;
    item.isEquipped = true;
    
    console.log(`✅ Item equipado: ${item.name}`);
    return true;
  }

  /**
   * Desequipar item
   */
  unequipItem(itemType: ItemType): boolean {
    const slot = this.getEquipmentSlot(itemType);
    const equippedItem = this.equipment[slot];
    
    if (!equippedItem) {
      return false;
    }

    equippedItem.isEquipped = false;
    delete this.equipment[slot];
    
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
