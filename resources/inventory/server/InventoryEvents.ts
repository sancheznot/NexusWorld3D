import { Room, Client } from 'colyseus';
import { InventoryItem, Inventory } from '@/types/inventory.types';
import { ITEMS_CATALOG } from '@/constants/items';
import { GAME_CONFIG } from '@/constants/game';

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
  private economyEvents: any; // EconomyEvents instance

  constructor(room: Room, economyEvents?: any) {
    this.room = room;
    this.economyEvents = economyEvents;
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
      inventory = this.createInitialInventory();
      this.playerInventories.set(playerId, inventory);
    }

    // Enriquecer con catálogo maestro
    const cat = ITEMS_CATALOG[baseItem.itemId];
    const merged: InventoryItem = {
      id: `${baseItem.itemId}_${Date.now()}`,
      itemId: baseItem.itemId,
      name: (baseItem as any).name || cat?.name || baseItem.itemId,
      description: (baseItem as any).description || '',
      type: (baseItem as any).type || cat?.type || 'misc',
      rarity: (baseItem as any).rarity || cat?.rarity || 'common',
      quantity: (baseItem as any).quantity || 1,
      maxStack: (baseItem as any).maxStack || 1,
      weight: (baseItem as any).weight ?? cat?.weight ?? 0.1,
      stats: (baseItem as any).stats,
      durability: (baseItem as any).durability,
      maxDurability: (baseItem as any).maxDurability,
      level: (baseItem as any).level || 1,
      icon: (baseItem as any).icon || cat?.icon || '📦',
      thumb: (baseItem as any).thumb || cat?.thumb,
      model: cat?.visual?.path,
      isEquipped: false,
      slot: -1,
    } as InventoryItem;

    // Stack si mismo itemId y maxStack > 1
    const existing = inventory.items.find(i => i.itemId === merged.itemId && !i.isEquipped && i.quantity < i.maxStack);
    if (existing) {
      existing.quantity += merged.quantity || 1;
    } else {
      inventory.items.push(merged);
      inventory.usedSlots += 1;
    }
    inventory.currentWeight = this.calculateTotalWeight(inventory);
    this.playerInventories.set(playerId, inventory);

    // Notificar
    this.room.broadcast('inventory:item-added', {
      playerId,
      item: merged,
      action: 'add',
      timestamp: Date.now()
    } as ItemUpdateData);
  }

  /**
   * Manejar actualización completa del inventario
   */
  private handleInventoryUpdate(client: Client, data: { inventory: Inventory }) {
    const playerId = client.sessionId;
    
    console.log(`📦 [DEBUG] handleInventoryUpdate: playerId=${playerId}`);
    console.log(`📦 [DEBUG] Datos recibidos:`, data.inventory);
    
    // Validar datos del inventario
    if (!this.validateInventory(data.inventory)) {
      console.log(`❌ [DEBUG] Inventario inválido para ${playerId}`);
      client.send('inventory:error', { message: 'Datos de inventario inválidos' });
      return;
    }

    // Normalizar slots y actualizar inventario del jugador
    const normalized = this.ensureSlots({ ...data.inventory });
    this.playerInventories.set(playerId, normalized);
    console.log(`✅ [DEBUG] Inventario actualizado en servidor para ${playerId}:`, data.inventory);

    // Enviar actualización a todos los jugadores
    this.room.broadcast('inventory:updated', {
      playerId,
      inventory: normalized,
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
    this.playerInventories.set(playerId, this.ensureSlots(inventory));

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
  private handleUseItem(client: Client, data: { id?: string; itemId: string; slot: number }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    console.log(`🍎 [DEBUG] handleUseItem: playerId=${playerId}, itemId=${data.itemId}, slot=${data.slot}`);

    if (!inventory) {
      console.log(`❌ [DEBUG] Inventario no encontrado para ${playerId}`);
      client.send('inventory:error', { message: 'Inventario no encontrado' });
      return;
    }

    // Buscar primero por id único si viene, sinó por itemId (stack)
    let item = data.id ? inventory.items.find(i => i.id === data.id) : undefined;
    if (!item) {
      item = inventory.items.find(i => i.itemId === data.itemId);
    }
    
    if (!item) {
      console.log(`❌ [DEBUG] Item no encontrado: ${data.itemId} en inventario de ${playerId}`);
      console.log(`📦 [DEBUG] Items disponibles:`, inventory.items.map(i => ({ id: i.id, itemId: i.itemId, name: i.name })));
      client.send('inventory:error', { message: 'Item no encontrado' });
      return;
    }

    console.log(`✅ [DEBUG] Item encontrado: ${item.name} (${item.itemId}), tipo: ${item.type}`);

    if (item.type !== 'consumable') {
      console.log(`❌ [DEBUG] Item no consumible: ${item.type}`);
      client.send('inventory:error', { message: 'Item no consumible' });
      return;
    }

    // Aplicar efectos según catálogo
    const catalog = ITEMS_CATALOG[item.itemId];
    console.log(`🔍 [DEBUG] Catálogo para ${item.itemId}:`, catalog);
    
    if (catalog?.effects?.gold && typeof catalog.effects.gold === 'number') {
      // Sumar oro al monedero (economía) y reflejar inventario
      const amountMajor = catalog.effects.gold;
      console.log(`💰 [DEBUG] Aplicando efecto oro: +${amountMajor} para ${playerId}`);
      
      // Notificar economía (wallet) usando referencia directa
      if (this.economyEvents) {
        this.economyEvents.creditWalletMajor(playerId, amountMajor, `use:${item.itemId}`);
        console.log(`💰 Crédito aplicado: +${amountMajor} al wallet de ${playerId}`);
      } else {
        console.warn('⚠️ EconomyEvents no disponible para crédito de wallet');
      }
      const newGold = (inventory.gold || 0) + amountMajor;
      inventory.gold = newGold;
      this.room.broadcast('inventory:gold-updated', {
        playerId,
        amount: newGold,
        change: amountMajor,
        reason: `use:${item.itemId}`,
        timestamp: Date.now()
      });
    } else {
      console.log(`⚠️ [DEBUG] No hay efectos de oro para ${item.itemId} o catálogo no encontrado`);
    }
    if (catalog?.effects?.health) {
      // TODO: integrar con sistema de vida de jugador si está disponible
    }
    if (catalog?.effects?.food) {
      // TODO: integrar con sistema de hambre cuando exista (store/redis)
    }

    // Notificar uso del item (después de aplicar efectos, antes de mutar)
    this.room.broadcast('inventory:item-used', {
      playerId,
      item,
      action: 'use',
      timestamp: Date.now()
    } as ItemUpdateData);

    console.log(`🍎 Item usado: ${item.name} por jugador ${playerId}`);

    // Consumir 1 unidad únicamente del stack correspondiente (usar id único)
    const beforeCount = inventory.items.length;
    const idx = inventory.items.findIndex(i => i.id === item.id);
    if (idx > -1) {
      const it = inventory.items[idx];
      if (it.quantity <= 1) {
        inventory.items.splice(idx, 1);
        inventory.usedSlots = Math.max(0, (inventory.usedSlots || 0) - 1);
      } else {
        it.quantity -= 1;
      }
      inventory.currentWeight = this.calculateTotalWeight(inventory);
      this.playerInventories.set(playerId, this.ensureSlots(inventory));

      // Enviar snapshot actualizado al propio jugador
      client.send('inventory:updated', {
        playerId,
        inventory: this.playerInventories.get(playerId)!,
        timestamp: Date.now(),
      } as InventoryEventData);
      const afterCount = inventory.items.length;
      console.log(`📦 [DEBUG] Consumo aplicado. Items antes=${beforeCount}, después=${afterCount}.`);
    }
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
   * Crear inventario inicial para un jugador
   */
  private createInitialInventory(): Inventory {
    return {
      items: [],
      maxSlots: 20,
      usedSlots: 0,
      gold: GAME_CONFIG.currency.startingBalance, // Usar configuración de economía
      maxWeight: 100,
      currentWeight: 0
    };
  }

  /**
   * API pública para crear inventario inicial de un jugador
   */
  public createPlayerInventory(playerId: string): Inventory {
    const inventory = this.createInitialInventory();
    this.playerInventories.set(playerId, inventory);
    console.log(`📦 Inventario inicial creado para jugador ${playerId}`);
    return inventory;
  }

  /**
   * Manejar solicitud de inventario
   */
  private handleInventoryRequest(client: Client) {
    const playerId = client.sessionId;
    let inventory = this.playerInventories.get(playerId);

    console.log(`📦 [DEBUG] handleInventoryRequest: playerId=${playerId}`);
    console.log(`📦 [DEBUG] Inventario actual en servidor:`, inventory);

    if (!inventory) {
      // Crear inventario inicial si no existe
      inventory = this.createInitialInventory();
      this.playerInventories.set(playerId, inventory);
      console.log(`📦 Inventario inicial creado para jugador ${playerId}`);
    }

    const normalized = this.ensureSlots(inventory);
    console.log(`📦 [DEBUG] Enviando inventario al cliente:`, normalized);
    client.send('inventory:data', normalized);
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
   * Asegura que todos los items tienen un slot único en rango [0, maxSlots)
   * Mantiene slots existentes; asigna slots libres a los -1/undefined conservando orden
   */
  private ensureSlots(inv: Inventory): Inventory {
    const taken = new Set<number>();
    for (const it of inv.items) {
      if (typeof it.slot === 'number' && it.slot >= 0 && it.slot < inv.maxSlots) {
        taken.add(it.slot);
      }
    }
    let next = 0;
    const getNextFree = () => {
      while (taken.has(next) && next < inv.maxSlots) next++;
      taken.add(next);
      return next;
    };
    for (const it of inv.items) {
      if (!(typeof it.slot === 'number' && it.slot >= 0 && it.slot < inv.maxSlots)) {
        it.slot = getNextFree();
      }
    }
    inv.usedSlots = inv.items.length;
    return inv;
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
