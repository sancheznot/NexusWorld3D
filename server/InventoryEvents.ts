import { Room, Client } from 'colyseus';
import { InventoryItem, Inventory } from '../src/types/inventory.types';

/**
 * Eventos de Inventario para Colyseus
 * Maneja la sincronización del inventario entre jugadores
 */

export interface InventoryEventData {
  playerId: string;
  inventory: Inventory;
  timestamp: number;
}

export interface ItemUpdateData {
  playerId: string;
  item: InventoryItem;
  action: 'add' | 'remove' | 'update' | 'use' | 'equip' | 'unequip';
  timestamp: number;
}

export interface GoldUpdateData {
  playerId: string;
  amount: number;
  change: number; // + o - cantidad
  reason: string;
  timestamp: number;
}

export class InventoryEvents {
  private room: Room;
  private playerInventories = new Map<string, Inventory>();

  constructor(room: Room) {
    this.room = room;
    this.setupEventHandlers();
  }

  /**
   * Configurar los manejadores de eventos de inventario
   */
  private setupEventHandlers() {
    // Evento: Actualizar inventario completo
    this.room.onMessage('inventory:update', (client: Client, data: { inventory: Inventory }) => {
      this.handleInventoryUpdate(client, data);
    });

    // Evento: Agregar item
    this.room.onMessage('inventory:add-item', (client: Client, data: { item: InventoryItem }) => {
      this.handleAddItem(client, data);
    });

    // Evento: Remover item
    this.room.onMessage('inventory:remove-item', (client: Client, data: { itemId: string; quantity?: number }) => {
      this.handleRemoveItem(client, data);
    });

    // Evento: Usar item
    this.room.onMessage('inventory:use-item', (client: Client, data: { itemId: string; slot: number }) => {
      this.handleUseItem(client, data);
    });

    // Evento: Equipar item
    this.room.onMessage('inventory:equip-item', (client: Client, data: { itemId: string }) => {
      this.handleEquipItem(client, data);
    });

    // Evento: Desequipar item
    this.room.onMessage('inventory:unequip-item', (client: Client, data: { itemType: string }) => {
      this.handleUnequipItem(client, data);
    });

    // Evento: Actualizar oro
    this.room.onMessage('inventory:update-gold', (client: Client, data: { amount: number; reason: string }) => {
      this.handleGoldUpdate(client, data);
    });

    // Evento: Solicitar inventario
    this.room.onMessage('inventory:request', (client: Client) => {
      this.handleInventoryRequest(client);
    });
  }

  // API pública para otros módulos del servidor
  public addItemFromWorld(playerId: string, baseItem: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) {
    let inventory = this.playerInventories.get(playerId);
    if (!inventory) {
      // Inicializar inventario básico si no existe aún
      inventory = {
        items: [],
        maxSlots: 20,
        usedSlots: 0,
        gold: 0,
        maxWeight: 100,
        currentWeight: 0,
      } as Inventory;
    }

    const item: InventoryItem = {
      ...baseItem,
      id: `${baseItem.itemId}_${Date.now()}`,
      isEquipped: false,
      slot: -1,
    } as InventoryItem;

    // Stack si mismo itemId y maxStack > 1
    const existing = inventory.items.find(i => i.itemId === baseItem.itemId && !i.isEquipped && i.quantity < i.maxStack);
    if (existing) {
      existing.quantity += baseItem.quantity || 1;
    } else {
      inventory.items.push(item);
      inventory.usedSlots += 1;
    }
    inventory.currentWeight = this.calculateTotalWeight(inventory);
    this.playerInventories.set(playerId, inventory);

    // Notificar
    this.room.broadcast('inventory:item-added', {
      playerId,
      item,
      action: 'add',
      timestamp: Date.now()
    } as ItemUpdateData);
  }

  /**
   * Manejar actualización completa del inventario
   */
  private handleInventoryUpdate(client: Client, data: { inventory: Inventory }) {
    const playerId = client.sessionId;
    
    // Validar datos del inventario
    if (!this.validateInventory(data.inventory)) {
      client.send('inventory:error', { message: 'Datos de inventario inválidos' });
      return;
    }

    // Actualizar inventario del jugador
    this.playerInventories.set(playerId, data.inventory);

    // Enviar actualización a todos los jugadores
    this.room.broadcast('inventory:updated', {
      playerId,
      inventory: data.inventory,
      timestamp: Date.now()
    } as InventoryEventData);

    console.log(`📦 Inventario actualizado para jugador ${playerId}`);
  }

  /**
   * Manejar agregar item
   */
  private handleAddItem(client: Client, data: { item: InventoryItem }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    // Validar item
    if (!this.validateItem(data.item)) {
      client.send('inventory:error', { message: 'Item inválido' });
      return;
    }

    // Agregar item al inventario
    inventory.items.push(data.item);
    inventory.usedSlots++;
    inventory.currentWeight = this.calculateTotalWeight(inventory);

    // Actualizar inventario
    this.playerInventories.set(playerId, inventory);

    // Notificar a todos los jugadores
    this.room.broadcast('inventory:item-added', {
      playerId,
      item: data.item,
      action: 'add',
      timestamp: Date.now()
    } as ItemUpdateData);

    console.log(`➕ Item agregado: ${data.item.name} para jugador ${playerId}`);
  }

  /**
   * Manejar remover item
   */
  private handleRemoveItem(client: Client, data: { itemId: string; quantity?: number }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    const itemIndex = inventory.items.findIndex(item => item.id === data.itemId);
    if (itemIndex === -1) {
      client.send('inventory:error', { message: 'Item no encontrado' });
      return;
    }

    const item = inventory.items[itemIndex];
    const quantity = data.quantity || 1;

    if (item.quantity <= quantity) {
      // Remover item completamente
      inventory.items.splice(itemIndex, 1);
      inventory.usedSlots--;
    } else {
      // Reducir cantidad
      item.quantity -= quantity;
    }

    inventory.currentWeight = this.calculateTotalWeight(inventory);
    this.playerInventories.set(playerId, inventory);

    // Notificar a todos los jugadores
    this.room.broadcast('inventory:item-removed', {
      playerId,
      item,
      action: 'remove',
      timestamp: Date.now()
    } as ItemUpdateData);

    console.log(`➖ Item removido: ${item.name} para jugador ${playerId}`);
  }

  /**
   * Manejar usar item
   */
  private handleUseItem(client: Client, data: { itemId: string; slot: number }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    const item = inventory.items.find(i => i.id === data.itemId);
    if (!item) {
      client.send('inventory:error', { message: 'Item no encontrado' });
      return;
    }

    if (item.type !== 'consumable') {
      client.send('inventory:error', { message: 'Item no consumible' });
      return;
    }

    // Notificar uso del item
    this.room.broadcast('inventory:item-used', {
      playerId,
      item,
      action: 'use',
      timestamp: Date.now()
    } as ItemUpdateData);

    console.log(`🍎 Item usado: ${item.name} por jugador ${playerId}`);
  }

  /**
   * Manejar equipar item
   */
  private handleEquipItem(client: Client, data: { itemId: string }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    const item = inventory.items.find(i => i.id === data.itemId);
    if (!item) {
      client.send('inventory:error', { message: 'Item no encontrado' });
      return;
    }

    // Marcar como equipado
    item.isEquipped = true;

    // Notificar equipamiento
    this.room.broadcast('inventory:item-equipped', {
      playerId,
      item,
      action: 'equip',
      timestamp: Date.now()
    } as ItemUpdateData);

    console.log(`⚔️ Item equipado: ${item.name} por jugador ${playerId}`);
  }

  /**
   * Manejar desequipar item
   */
  private handleUnequipItem(client: Client, data: { itemType: string }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    const item = inventory.items.find(i => i.type === data.itemType && i.isEquipped);
    if (!item) {
      client.send('inventory:error', { message: 'Item no equipado' });
      return;
    }

    // Marcar como no equipado
    item.isEquipped = false;

    // Notificar desequipamiento
    this.room.broadcast('inventory:item-unequipped', {
      playerId,
      item,
      action: 'unequip',
      timestamp: Date.now()
    } as ItemUpdateData);

    console.log(`🔓 Item desequipado: ${item.name} por jugador ${playerId}`);
  }

  /**
   * Manejar actualización de oro
   */
  private handleGoldUpdate(client: Client, data: { amount: number; reason: string }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    const change = data.amount - inventory.gold;
    inventory.gold = data.amount;

    this.playerInventories.set(playerId, inventory);

    // Notificar cambio de oro
    this.room.broadcast('inventory:gold-updated', {
      playerId,
      amount: data.amount,
      change,
      reason: data.reason,
      timestamp: Date.now()
    } as GoldUpdateData);

    console.log(`💰 Oro actualizado: ${data.amount} (${change > 0 ? '+' : ''}${change}) para jugador ${playerId}`);
  }

  /**
   * Manejar solicitud de inventario
   */
  private handleInventoryRequest(client: Client) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (inventory) {
      client.send('inventory:data', inventory);
    } else {
      client.send('inventory:error', { message: 'Inventario no encontrado' });
    }
  }

  /**
   * Validar inventario
   */
  private validateInventory(inventory: Inventory): boolean {
    return (
      Array.isArray(inventory.items) &&
      typeof inventory.maxSlots === 'number' &&
      typeof inventory.usedSlots === 'number' &&
      typeof inventory.gold === 'number' &&
      typeof inventory.maxWeight === 'number' &&
      typeof inventory.currentWeight === 'number'
    );
  }

  /**
   * Validar item
   */
  private validateItem(item: InventoryItem): boolean {
    return (
      typeof item.id === 'string' &&
      typeof item.itemId === 'string' &&
      typeof item.name === 'string' &&
      typeof item.quantity === 'number' &&
      typeof item.maxStack === 'number' &&
      typeof item.weight === 'number' &&
      typeof item.level === 'number' &&
      typeof item.isEquipped === 'boolean'
    );
  }

  /**
   * Calcular peso total del inventario
   */
  private calculateTotalWeight(inventory: Inventory): number {
    return inventory.items.reduce((total, item) => {
      return total + (item.weight * item.quantity);
    }, 0);
  }

  /**
   * Obtener inventario de un jugador
   */
  public getPlayerInventory(playerId: string): Inventory | undefined {
    return this.playerInventories.get(playerId);
  }

  /**
   * Establecer inventario de un jugador
   */
  public setPlayerInventory(playerId: string, inventory: Inventory): void {
    this.playerInventories.set(playerId, inventory);
  }

  /**
   * Limpiar inventario cuando un jugador se desconecta
   */
  public cleanupPlayerInventory(playerId: string): void {
    this.playerInventories.delete(playerId);
    console.log(`🧹 Inventario limpiado para jugador ${playerId}`);
  }
}
