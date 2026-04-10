import { Room, Client } from 'colyseus';
import { InventoryItem, Inventory } from '@/types/inventory.types';
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
import { GAME_CONFIG } from '@/constants/game';
import { CRAFTING_RECIPES, type CraftRecipe } from '@/constants/crafting';
import { CraftingMessages, InventoryMessages } from '@nexusworld3d/protocol';
import {
  getContentManifest,
  isDeclaredManifestItemId,
} from '@server/content/loadContentManifest';
import { getItemConsumeEffects } from '@nexusworld3d/engine-server/item-effect-registry';

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
    this.room.onMessage(InventoryMessages.Update, (client: Client, data: { inventory: Inventory }) => {
      this.handleInventoryUpdate(client, data);
    });

    // Evento: Agregar item
    this.room.onMessage(InventoryMessages.AddItem, (client: Client, data: { item: InventoryItem }) => {
      this.handleAddItem(client, data);
    });

    // Evento: Remover item
    this.room.onMessage(InventoryMessages.RemoveItem, (client: Client, data: { itemId: string; quantity?: number }) => {
      this.handleRemoveItem(client, data);
    });

    // Evento: Usar item
    this.room.onMessage(InventoryMessages.UseItem, (client: Client, data: { itemId: string; slot: number }) => {
      this.handleUseItem(client, data);
    });

    // Evento: Equipar item
    this.room.onMessage(InventoryMessages.EquipItem, (client: Client, data: { itemId: string }) => {
      this.handleEquipItem(client, data);
    });

    // Evento: Desequipar item
    this.room.onMessage(InventoryMessages.UnequipItem, (client: Client, data: { itemType: string }) => {
      this.handleUnequipItem(client, data);
    });

    // Evento: Actualizar oro
    this.room.onMessage(InventoryMessages.UpdateGold, (client: Client, data: { amount: number; reason: string }) => {
      this.handleGoldUpdate(client, data);
    });

    // Evento: Solicitar inventario
    this.room.onMessage(InventoryMessages.Request, (client: Client) => {
      this.handleInventoryRequest(client);
    });

    this.room.onMessage(
      CraftingMessages.Execute,
      (client: Client, data: { recipeId: string }) => {
        const res = this.tryCraftRecipe(client.sessionId, data.recipeId);
        if (!res.ok) {
          client.send(InventoryMessages.Error, {
            message: res.message || 'Craft fallido',
          });
        }
      }
    );

    this.room.onMessage(
      InventoryMessages.SwapSlots,
      (client: Client, data: { fromSlot: number; toSlot: number }) => {
        this.handleSwapSlots(client, data);
      }
    );
  }

  /**
   * ES: Quitar del inventario del jugador y devolver plantilla para spawn en el mundo.
   */
  public removeItemStackReturningBase(
    playerId: string,
    itemInstanceId: string,
    quantity: number
  ): {
    ok: boolean;
    base?: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
    message?: string;
  } {
    const inv = this.playerInventories.get(playerId);
    if (!inv) return { ok: false, message: 'Sin inventario' };
    const idx = inv.items.findIndex((i) => i.id === itemInstanceId);
    if (idx === -1) return { ok: false, message: 'Ítem no encontrado' };
    const item = inv.items[idx]!;
    if (item.isEquipped) return { ok: false, message: 'Desequipa antes de soltar' };
    const qty = Math.min(Math.max(1, quantity), item.quantity);

    const base: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'> = {
      itemId: item.itemId,
      name: item.name,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      quantity: qty,
      maxStack: item.maxStack,
      weight: item.weight,
      stats: item.stats,
      durability: item.durability,
      maxDurability: item.maxDurability,
      level: item.level,
      icon: item.icon,
      thumb: item.thumb,
      model: item.model,
    };

    if (item.quantity <= qty) {
      inv.items.splice(idx, 1);
    } else {
      item.quantity -= qty;
    }
    inv.currentWeight = this.calculateTotalWeight(inv);
    const normalized = this.ensureSlots(inv);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
    return { ok: true, base };
  }

  private canAffordRecipe(inv: Inventory, recipe: CraftRecipe): boolean {
    for (const ing of recipe.ingredients) {
      let need = ing.quantity;
      for (const it of inv.items) {
        if (it.isEquipped || it.itemId !== ing.itemId) continue;
        need -= it.quantity;
        if (need <= 0) break;
      }
      if (need > 0) return false;
    }
    return true;
  }

  private consumeRecipeIngredients(
    playerId: string,
    recipe: CraftRecipe
  ): boolean {
    const inv = this.playerInventories.get(playerId);
    if (!inv || !this.canAffordRecipe(inv, recipe)) return false;

    for (const ing of recipe.ingredients) {
      let need = ing.quantity;
      for (let i = inv.items.length - 1; i >= 0 && need > 0; i--) {
        const it = inv.items[i]!;
        if (it.isEquipped || it.itemId !== ing.itemId) continue;
        const take = Math.min(need, it.quantity);
        need -= take;
        it.quantity -= take;
        if (it.quantity <= 0) {
          inv.items.splice(i, 1);
        }
      }
      if (need > 0) return false;
    }
    inv.usedSlots = inv.items.length;
    inv.currentWeight = this.calculateTotalWeight(inv);
    this.playerInventories.set(playerId, this.ensureSlots(inv));
    return true;
  }

  public tryCraftRecipe(
    playerId: string,
    recipeId: string
  ): { ok: boolean; message?: string } {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { ok: false, message: 'Receta desconocida' };
    if (!this.consumeRecipeIngredients(playerId, recipe)) {
      return { ok: false, message: 'Materiales insuficientes' };
    }
    void this.addItemFromWorld(playerId, {
      itemId: recipe.output.itemId,
      quantity: recipe.output.quantity,
    } as Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>);
    const inv = this.playerInventories.get(playerId);
    if (inv) {
      this.room.broadcast(InventoryMessages.Updated, {
        playerId,
        inventory: inv,
        timestamp: Date.now(),
      } as InventoryEventData);
    }
    return { ok: true };
  }

  /**
   * ES: Consume pilas por itemId (no equipados); broadcast inventario si tuvo éxito.
   * EN: Consume stacks by catalog itemId (non-equipped); broadcast on success.
   */
  public tryConsumeCatalogItems(
    playerId: string,
    ingredients: { itemId: string; quantity: number }[]
  ): boolean {
    const pseudo: CraftRecipe = {
      id: "__housing_consume",
      nameEs: "",
      nameEn: "",
      ingredients,
      output: { itemId: "__void", quantity: 1 },
    };
    const inv = this.playerInventories.get(playerId);
    if (!inv || !this.canAffordRecipe(inv, pseudo)) return false;
    if (!this.consumeRecipeIngredients(playerId, pseudo)) return false;
    const normalized = this.ensureSlots(this.playerInventories.get(playerId)!);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
    return true;
  }

  /**
   * ES: Añade ítem desde mundo/craft/tienda. Devuelve unidades realmente añadidas (0 si falló peso/ranuras).
   * EN: Add item from world/craft/shop; returns units actually added (0 if weight/slots block).
   */
  public addItemFromWorld(
    playerId: string,
    baseItem: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>
  ): number {
    let inventory = this.playerInventories.get(playerId);
    if (!inventory) {
      inventory = this.createInitialInventory();
      this.playerInventories.set(playerId, inventory);
    }

    // ES: Antes del merge: alinear maxStack con catálogo (p. ej. troncos 117 con maxStack 30 guardado).
    // EN: Before merge: catalog maxStack so stacks like 117 vs stale maxStack 30 can accept more.
    applyCatalogStackCapsToItems(inventory.items);
    coalesceInventoryStacks(inventory);
    splitOversizedStacks(inventory);

    const cat = ITEMS_CATALOG[baseItem.itemId];
    const itemId = baseItem.itemId;

    if (getContentManifest() && !isDeclaredManifestItemId(itemId)) {
      console.warn(
        `[inventory] addItemFromWorld rejected: "${itemId}" not in content manifest`
      );
      this.sendInventoryError(
        playerId,
        'Este objeto no está disponible en esta versión del mundo.'
      );
      return 0;
    }

    const fromPayload =
      typeof (baseItem as any).maxStack === 'number' && (baseItem as any).maxStack > 0
        ? Math.floor((baseItem as any).maxStack)
        : 0;
    const maxStack = Math.max(catalogMaxStack(itemId), fromPayload);
    const unitW = (baseItem as any).weight ?? cat?.weight ?? 0.1;
    const qtyRequested = Math.max(1, Math.floor((baseItem as any).quantity ?? 1));
    let remaining = qtyRequested;

    const roomW = inventory.maxWeight - this.calculateTotalWeight(inventory);
    if (roomW < unitW) {
      this.sendInventoryError(
        playerId,
        'No tienes capacidad de peso para recoger esto. Deja ítems o sube resistencia/nivel.'
      );
      return 0;
    }
    remaining = Math.min(remaining, Math.floor(roomW / unitW));
    if (remaining <= 0) {
      this.sendInventoryError(
        playerId,
        'Inventario demasiado pesado: no cabe ni una unidad más.'
      );
      return 0;
    }
    const remainingAfterWeightCap = remaining;

    let maxDurability = (baseItem as any).maxDurability as number | undefined;
    let durability = (baseItem as any).durability as number | undefined;
    const catMd = catalogMaxDurability(itemId);
    if (isChopAxeItemId(itemId) || isMinePickaxeItemId(itemId)) {
      maxDurability = maxDurability ?? 80;
      durability = typeof durability === 'number' ? durability : maxDurability;
    } else if (catMd) {
      maxDurability = maxDurability ?? catMd;
      durability = typeof durability === 'number' ? durability : maxDurability;
    }

    const incomingMeta: Pick<InventoryItem, 'itemId' | 'maxDurability' | 'durability'> = {
      itemId,
      maxDurability,
      durability,
    };

    let placedAny = false;
    while (remaining > 0) {
      const existing = inventory.items.find(
        (i) =>
          !i.isEquipped &&
          i.quantity < i.maxStack &&
          canMergeIntoStack(i, incomingMeta)
      );

      if (existing) {
        const space = existing.maxStack - existing.quantity;
        const add = Math.min(space, remaining);
        existing.quantity += add;
        remaining -= add;
        placedAny = true;
        continue;
      }

      if (inventory.items.length >= inventory.maxSlots) {
        break;
      }

      const chunk = Math.min(remaining, maxStack);
      const merged: InventoryItem = {
        id: `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        itemId,
        name: (baseItem as any).name || cat?.name || itemId,
        description: (baseItem as any).description || '',
        type: (baseItem as any).type || cat?.type || 'misc',
        rarity: (baseItem as any).rarity || cat?.rarity || 'common',
        quantity: chunk,
        maxStack,
        weight: unitW,
        stats: (baseItem as any).stats,
        durability,
        maxDurability,
        level: (baseItem as any).level || 1,
        icon: (baseItem as any).icon || cat?.icon || '📦',
        thumb: (baseItem as any).thumb || cat?.thumb,
        model: (baseItem as any).model || cat?.visual?.path,
        isEquipped: false,
        slot: -1,
      };

      inventory.items.push(merged);
      inventory.usedSlots = inventory.items.length;
      remaining -= chunk;
      placedAny = true;
    }

    if (remaining > 0) {
      if (!placedAny && inventory.items.length >= inventory.maxSlots) {
        this.sendInventoryError(
          playerId,
          'No hay ranuras libres en el inventario.'
        );
      } else if (!placedAny) {
        this.sendInventoryError(
          playerId,
          'No se pudo guardar el ítem (inventario lleno).'
        );
      } else {
        this.sendInventoryError(
          playerId,
          `Solo cabía parte del botín (${remaining} un. no entraron).`
        );
      }
    }

    const unitsAdded = remainingAfterWeightCap - remaining;

    inventory.currentWeight = this.calculateTotalWeight(inventory);
    applyCatalogStackCapsToItems(inventory.items);
    coalesceInventoryStacks(inventory);
    const normalized = this.ensureSlots(inventory);
    this.playerInventories.set(playerId, normalized);

    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);

    return unitsAdded;
  }

  /**
   * ES: Desgaste del hacha por golpe de tala; si llega a 0 se elimina el ítem.
   * EN: Axe durability per chop swing; removes item at 0.
   */
  public applyAxeSwingWear(playerId: string): void {
    const inv = this.playerInventories.get(playerId);
    if (!inv) return;
    const axe = inv.items.find(
      (i) => isChopAxeItemId(i.itemId) && (i.quantity ?? 1) > 0
    );
    if (!axe || (axe.quantity ?? 0) <= 0) return;

    const maxD = axe.maxDurability ?? 80;
    const cur =
      typeof axe.durability === 'number' ? axe.durability : maxD;
    const next = cur - 1;

    if (next <= 0) {
      const idx = inv.items.indexOf(axe);
      if (idx !== -1) {
        inv.items.splice(idx, 1);
        inv.usedSlots = Math.max(0, (inv.usedSlots || 1) - 1);
      }
    } else {
      axe.durability = next;
    }

    inv.currentWeight = this.calculateTotalWeight(inv);
    const normalized = this.ensureSlots(inv);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
  }

  /**
   * ES: Desgaste del pico por golpe de mina; si llega a 0 se elimina el ítem.
   * EN: Pickaxe durability per mine swing; removes item at 0.
   */
  public applyPickaxeSwingWear(playerId: string): void {
    const inv = this.playerInventories.get(playerId);
    if (!inv) return;
    const pick = inv.items.find(
      (i) => isMinePickaxeItemId(i.itemId) && (i.quantity ?? 1) > 0
    );
    if (!pick || (pick.quantity ?? 0) <= 0) return;

    const maxD = pick.maxDurability ?? 80;
    const cur =
      typeof pick.durability === 'number' ? pick.durability : maxD;
    const next = cur - 1;

    if (next <= 0) {
      const idx = inv.items.indexOf(pick);
      if (idx !== -1) {
        inv.items.splice(idx, 1);
        inv.usedSlots = Math.max(0, (inv.usedSlots || 1) - 1);
      }
    } else {
      pick.durability = next;
    }

    inv.currentWeight = this.calculateTotalWeight(inv);
    const normalized = this.ensureSlots(inv);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
  }

  /**
   * ES: Desgaste del arma equipada al atacar (el hacha se desgasta al talar, no aquí).
   * EN: Equipped weapon wear on attack (axes wear on chop, not here).
   */
  public applyEquippedMeleeWeaponWear(playerId: string, loss: number = 1): void {
    const inv = this.playerInventories.get(playerId);
    if (!inv) return;
    const weapon = inv.items.find((i) => i.isEquipped && i.type === 'weapon');
    if (!weapon) return;
    if (isChopAxeItemId(weapon.itemId) || isMinePickaxeItemId(weapon.itemId))
      return;

    const maxD =
      typeof weapon.maxDurability === 'number' && weapon.maxDurability > 0
        ? weapon.maxDurability
        : catalogMaxDurability(weapon.itemId);
    if (typeof maxD !== 'number' || maxD <= 0) return;

    weapon.maxDurability = weapon.maxDurability ?? maxD;
    const cur =
      typeof weapon.durability === 'number' ? weapon.durability : weapon.maxDurability;
    const next = cur - loss;

    if (next <= 0) {
      const idx = inv.items.indexOf(weapon);
      if (idx !== -1) {
        inv.items.splice(idx, 1);
        inv.usedSlots = Math.max(0, inv.items.length);
      }
    } else {
      weapon.durability = next;
    }

    inv.currentWeight = this.calculateTotalWeight(inv);
    const normalized = this.ensureSlots(inv);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
  }

  private handleSwapSlots(client: Client, data: { fromSlot: number; toSlot: number }) {
    const fromSlot = Math.floor(data.fromSlot);
    const toSlot = Math.floor(data.toSlot);
    if (
      !Number.isFinite(fromSlot) ||
      !Number.isFinite(toSlot) ||
      fromSlot === toSlot
    ) {
      return;
    }
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) {
      client.send(InventoryMessages.Error, { message: 'Sin inventario' });
      return;
    }
    if (
      fromSlot < 0 ||
      toSlot < 0 ||
      fromSlot >= inventory.maxSlots ||
      toSlot >= inventory.maxSlots
    ) {
      client.send(InventoryMessages.Error, { message: 'Slot inválido' });
      return;
    }
    const a = inventory.items.find((i) => i.slot === fromSlot);
    const b = inventory.items.find((i) => i.slot === toSlot);
    if (!a && !b) return;
    if (a) a.slot = toSlot;
    if (b) b.slot = fromSlot;
    const normalized = this.ensureSlots(inventory);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
  }

  /**
   * ES: Restaurar inventario persistido (p. ej. Redis) al reconectar.
   * EN: Hydrate inventory from persisted snapshot.
   */
  public loadPersistedInventory(playerId: string, raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const src = raw as Inventory;
    const copy: Inventory = {
      items: Array.isArray(src.items)
        ? src.items.map((i) => ({
            ...i,
            isEquipped: !!i.isEquipped,
            quantity: typeof i.quantity === 'number' ? i.quantity : 1,
          }))
        : [],
      maxSlots: typeof src.maxSlots === 'number' ? src.maxSlots : 20,
      usedSlots: 0,
      gold:
        typeof src.gold === 'number'
          ? src.gold
          : GAME_CONFIG.currency.startingBalance,
      maxWeight: typeof src.maxWeight === 'number' ? src.maxWeight : 100,
      currentWeight: 0,
    };
    for (const it of copy.items) {
      if (isChopAxeItemId(it.itemId) || isMinePickaxeItemId(it.itemId)) {
        it.maxDurability = it.maxDurability ?? 80;
        it.durability =
          typeof it.durability === 'number' ? it.durability : it.maxDurability;
      } else {
        const md = catalogMaxDurability(it.itemId);
        if (md) {
          it.maxDurability = it.maxDurability ?? md;
          it.durability =
            typeof it.durability === 'number' ? it.durability : it.maxDurability;
        }
      }
    }
    applyCatalogStackCapsToItems(copy.items);
    coalesceInventoryStacks(copy);
    copy.usedSlots = copy.items.length;
    copy.currentWeight = this.calculateTotalWeight(copy);
    if (!this.validateInventory(copy)) return false;
    const normalized = this.ensureSlots(copy);
    this.playerInventories.set(playerId, normalized);
    return true;
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
      client.send(InventoryMessages.Error, { message: 'Datos de inventario inválidos' });
      return;
    }

    // Normalizar slots y actualizar inventario del jugador
    const normalized = this.ensureSlots({ ...data.inventory });
    this.playerInventories.set(playerId, normalized);
    console.log(`✅ [DEBUG] Inventario actualizado en servidor para ${playerId}:`, data.inventory);

    // Enviar actualización a todos los jugadores
    this.room.broadcast(InventoryMessages.Updated, {
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
      client.send(InventoryMessages.Error, { message: 'Inventario no encontrado' });
      return;
    }

    // Validar item
    if (!this.validateItem(data.item)) {
      client.send(InventoryMessages.Error, { message: 'Item inválido' });
      return;
    }

    if (!this.isClientAddItemAllowed(data.item.itemId)) {
      client.send(InventoryMessages.Error, {
        message: 'No se puede añadir ese objeto desde el cliente',
      });
      return;
    }

    // Agregar item al inventario
    inventory.items.push(data.item);
    inventory.usedSlots++;
    inventory.currentWeight = this.calculateTotalWeight(inventory);

    const normalized = this.ensureSlots(inventory);
    this.playerInventories.set(playerId, normalized);

    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);

    console.log(`➕ Item agregado: ${data.item.name} para jugador ${playerId}`);
  }

  /**
   * Manejar remover item
   */
  private handleRemoveItem(client: Client, data: { itemId: string; quantity?: number }) {
    const playerId = client.sessionId;
    const inventory = this.playerInventories.get(playerId);

    if (!inventory) {
      client.send(InventoryMessages.Error, { message: 'Inventario no encontrado' });
      return;
    }

    const itemIndex = inventory.items.findIndex(item => item.id === data.itemId);
    if (itemIndex === -1) {
      client.send(InventoryMessages.Error, { message: 'Item no encontrado' });
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
    this.room.broadcast(InventoryMessages.ItemRemoved, {
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
      client.send(InventoryMessages.Error, { message: 'Inventario no encontrado' });
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
      client.send(InventoryMessages.Error, { message: 'Item no encontrado' });
      return;
    }

    console.log(`✅ [DEBUG] Item encontrado: ${item.name} (${item.itemId}), tipo: ${item.type}`);

    if (item.type !== 'consumable') {
      console.log(`❌ [DEBUG] Item no consumible: ${item.type}`);
      client.send(InventoryMessages.Error, { message: 'Item no consumible' });
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
      this.room.broadcast(InventoryMessages.GoldUpdated, {
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

    for (const effect of getItemConsumeEffects(item.itemId)) {
      try {
        effect({
          room: this.room,
          client,
          playerId,
          itemId: item.itemId,
          economy: this.economyEvents,
        });
      } catch (e) {
        console.warn(`[registerItemEffect] ${item.itemId}`, e);
      }
    }

    // Notificar uso del item (después de aplicar efectos, antes de mutar)
    this.room.broadcast(InventoryMessages.ItemUsed, {
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
      client.send(InventoryMessages.Updated, {
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
      client.send(InventoryMessages.Error, { message: 'Inventario no encontrado' });
      return;
    }

    const item = inventory.items.find(i => i.id === data.itemId);
    if (!item) {
      client.send(InventoryMessages.Error, { message: 'Item no encontrado' });
      return;
    }

    // Marcar como equipado
    item.isEquipped = true;

    // Notificar equipamiento
    this.room.broadcast(InventoryMessages.ItemEquipped, {
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
      client.send(InventoryMessages.Error, { message: 'Inventario no encontrado' });
      return;
    }

    const item = inventory.items.find(i => i.type === data.itemType && i.isEquipped);
    if (!item) {
      client.send(InventoryMessages.Error, { message: 'Item no equipado' });
      return;
    }

    // Marcar como no equipado
    item.isEquipped = false;

    // Notificar desequipamiento
    this.room.broadcast(InventoryMessages.ItemUnequipped, {
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
      client.send(InventoryMessages.Error, { message: 'Inventario no encontrado' });
      return;
    }

    const change = data.amount - inventory.gold;
    inventory.gold = data.amount;

    this.playerInventories.set(playerId, inventory);

    // Notificar cambio de oro
    this.room.broadcast(InventoryMessages.GoldUpdated, {
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
    client.send(InventoryMessages.Data, normalized);
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
   * ES: El mensaje `inventory:add-item` no debe otorgar ids inventados (alinear con manifest).
   * EN: Client-initiated add must not grant arbitrary ids (manifest-aligned).
   */
  private isClientAddItemAllowed(itemId: string): boolean {
    if (!ITEMS_CATALOG[itemId]) return false;
    if (getContentManifest() && !isDeclaredManifestItemId(itemId)) return false;
    return true;
  }

  /**
   * Calcular peso total del inventario
   */
  private calculateTotalWeight(inventory: Inventory): number {
    return inventory.items.reduce((total, item) => {
      return total + (item.weight * item.quantity);
    }, 0);
  }

  private sendInventoryError(playerId: string, message: string): void {
    const c = this.room.clients.find((cl) => cl.sessionId === playerId);
    c?.send(InventoryMessages.Error, { message });
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

  /** ES: Al menos una unidad del ítem de catálogo (p. ej. tool_axe). EN: At least one catalog item. */
  public playerHasCatalogItem(playerId: string, catalogItemId: string): boolean {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) return false;
    return inventory.items.some(
      (i) => i.itemId === catalogItemId && (i.quantity ?? 1) > 0
    );
  }

  /** ES: Cualquier hacha de tala en inventario. EN: Any chop axe in inventory. */
  public playerHasAnyChopAxe(playerId: string): boolean {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) return false;
    return inventory.items.some(
      (i) => isChopAxeItemId(i.itemId) && (i.quantity ?? 1) > 0
    );
  }

  /**
   * ES: `itemId` del hacha usado para recompensa por golpe (equipada primero).
   * EN: Axe catalog id for per-hit rewards (equipped preferred).
   */
  public getChopToolCatalogId(playerId: string): string | null {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) return null;
    const usable = (i: InventoryItem) =>
      isChopAxeItemId(i.itemId) && (i.quantity ?? 1) > 0;
    const equipped = inventory.items.find((i) => i.isEquipped && usable(i));
    if (equipped) return equipped.itemId;
    const any = inventory.items.find(usable);
    return any?.itemId ?? null;
  }

  /** ES: Cualquier pico de mina en inventario. EN: Any mining pickaxe in inventory. */
  public playerHasAnyMinePickaxe(playerId: string): boolean {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) return false;
    return inventory.items.some(
      (i) => isMinePickaxeItemId(i.itemId) && (i.quantity ?? 1) > 0
    );
  }

  /**
   * ES: `itemId` del pico para recompensa por golpe (equipada primero).
   * EN: Pickaxe catalog id for per-hit rewards (equipped preferred).
   */
  public getMineToolCatalogId(playerId: string): string | null {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) return null;
    const usable = (i: InventoryItem) =>
      isMinePickaxeItemId(i.itemId) && (i.quantity ?? 1) > 0;
    const equipped = inventory.items.find((i) => i.isEquipped && usable(i));
    if (equipped) return equipped.itemId;
    const any = inventory.items.find(usable);
    return any?.itemId ?? null;
  }

  /**
   * ES: Peso/slots máx. (RPG nivel + stats). EN: Max weight/slots from RPG.
   */
  public applyCarryingCaps(
    playerId: string,
    maxWeight: number,
    maxSlots: number
  ): void {
    const inv = this.playerInventories.get(playerId);
    if (!inv) return;
    inv.maxWeight = maxWeight;
    inv.maxSlots = maxSlots;
    const normalized = this.ensureSlots(inv);
    this.playerInventories.set(playerId, normalized);
    this.room.broadcast(InventoryMessages.Updated, {
      playerId,
      inventory: normalized,
      timestamp: Date.now(),
    } as InventoryEventData);
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
