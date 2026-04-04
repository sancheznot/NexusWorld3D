import { useState, useEffect, useCallback } from 'react';
import economyClient from '@/lib/colyseus/EconomyClient';
import { colyseusClient } from '@/lib/colyseus/client';
import { inventoryService, DEFAULT_ITEMS } from '@/lib/services/inventory';
import inventoryClient from '@/lib/colyseus/InventoryClient';
import { InventoryItem, Inventory, Equipment, ItemType, ItemRarity } from '@/types/inventory.types';

/**
 * Hook para gestionar el inventario del jugador
 * Proporciona funciones para agregar, remover, equipar y usar items
 */
export function useInventory() {
  const [inventory, setInventory] = useState<Inventory>(() => inventoryService.getInventory());
  const [equipment, setEquipment] = useState<Equipment>(() => inventoryService.getEquipment());
  const [isLoading, setIsLoading] = useState(false);

  // Suscribirse a cambios del servicio y del servidor (Colyseus)
  useEffect(() => {
    const unsub = inventoryService.subscribe(() => {
      setInventory(inventoryService.getInventory());
      setEquipment(inventoryService.getEquipment());
    });
    const onWallet = (data: unknown) => {
      // data puede venir como número o como { amount }
      const payload = data as { amount?: number } | number | undefined;
      let amount = 0;
      if (typeof payload === 'number') amount = payload;
      else if (payload && typeof (payload as { amount?: number }).amount === 'number') amount = (payload as { amount?: number }).amount as number;
      // Fallback: si llega en minor units por error, normalizar
      if (amount >= 10000) amount = amount / 100;
      const inv = inventoryService.getInventory();
      inv.gold = Math.round(amount);
      inventoryService.setInventorySnapshot(inv);
      setInventory(inventoryService.getInventory());
      console.log(`💰 Wallet sincronizado: ${amount} -> inventario: ${inv.gold}`);
    };
    economyClient.on('economy:wallet', onWallet);

    // Suscripción a eventos del servidor de inventario
    const onInvUpdated = (data: { playerId: string; inventory: Inventory }) => {
      if (data?.inventory) {
        console.log(`📦 Inventario actualizado desde servidor:`, data.inventory);
        inventoryService.setInventorySnapshot(data.inventory);
        setInventory(inventoryService.getInventory());
        setEquipment(inventoryService.getEquipment());
      }
    };
    const onInvData = (data: Inventory) => {
      if (data) {
        console.log(`📦 Datos de inventario desde servidor:`, data);
        inventoryService.setInventorySnapshot(data as Inventory);
        setInventory(inventoryService.getInventory());
        setEquipment(inventoryService.getEquipment());
      }
    };
    inventoryClient.onInventoryUpdated(onInvUpdated);
    inventoryClient.onInventoryData(onInvData);
    
    // Esperar a que la conexión esté lista antes de solicitar inventario
    const requestInventory = () => {
      if (!colyseusClient.isConnectedToWorldRoom()) {
        setTimeout(requestInventory, 1000);
        return;
      }
      const room = inventoryClient.getRoom?.();
      if (room && room.connection.isOpen) {
        const currentInventory = inventoryService.getInventory();
        room.send('inventory:update', { inventory: currentInventory });
        console.log('📦 Enviando inventario actual al servidor:', currentInventory);
        room.send('inventory:request');
        console.log('📦 Solicitando inventario del servidor');
      } else {
        setTimeout(requestInventory, 1000);
      }
    };
    
    // Intentar solicitar inventario inmediatamente y luego cada segundo hasta que funcione
    requestInventory();
    economyClient.requestState();
    return () => {
      unsub();
      economyClient.off('economy:wallet', onWallet);
      inventoryClient.off('inventory:updated', onInvUpdated as unknown as (d: unknown) => void);
      inventoryClient.off('inventory:data', onInvData as unknown as (d: unknown) => void);
    };
  }, []);

  /**
   * Agregar item al inventario
   */
  const addItem = useCallback((item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) => {
    setIsLoading(true);
    try {
      const success = inventoryService.addItem(item);
      if (success) {
        setInventory(inventoryService.getInventory());
        console.log(`✅ Item agregado: ${item.name}`);
      } else {
        console.warn(`⚠️ No se pudo agregar item: ${item.name}`);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remover item del inventario
   */
  const removeItem = useCallback((itemId: string, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const success = inventoryService.removeItem(itemId, quantity);
      if (success) {
        setInventory(inventoryService.getInventory());
        setEquipment(inventoryService.getEquipment());
        console.log(`✅ Item removido: ${itemId}`);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Equipar item
   */
  const equipItem = useCallback((itemId: string) => {
    setIsLoading(true);
    try {
      const success = inventoryService.equipItem(itemId);
      if (success) {
        setInventory(inventoryService.getInventory());
        setEquipment(inventoryService.getEquipment());
        console.log(`✅ Item equipado: ${itemId}`);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Desequipar item
   */
  const unequipItem = useCallback((itemType: ItemType) => {
    setIsLoading(true);
    try {
      const success = inventoryService.unequipItem(itemType);
      if (success) {
        setInventory(inventoryService.getInventory());
        setEquipment(inventoryService.getEquipment());
        console.log(`✅ Item desequipado: ${itemType}`);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Usar item consumible
   */
  const consumeItem = useCallback((itemId: string) => {
    setIsLoading(true);
    try {
      const item = inventoryService.getInventory().items.find(i => i.id === itemId);
      if (item) {
        // Delegar al servidor para aplicar efectos (oro, salud, etc.)
        // Enviar id único y itemId lógico para consumir solo ese stack
        inventoryClient.useItem(item.id, item.itemId, item.slot ?? -1);
        console.log(`📡 Enviado a servidor: usar item id=${item.id} itemId=${item.itemId} (${item.name})`);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Agregar oro
   */
  const addGold = useCallback((amount: number) => {
    inventoryService.addGold(amount);
    setInventory(inventoryService.getInventory());
  }, []);

  /**
   * Remover oro
   */
  const removeGold = useCallback((amount: number) => {
    const success = inventoryService.removeGold(amount);
    if (success) {
      setInventory(inventoryService.getInventory());
    }
    return success;
  }, []);

  /**
   * Obtener items por tipo
   */
  const getItemsByType = useCallback((type: ItemType) => {
    return inventoryService.getItemsByType(type);
  }, []);

  /**
   * Obtener items por rareza
   */
  const getItemsByRarity = useCallback((rarity: ItemRarity) => {
    return inventoryService.getItemsByRarity(rarity);
  }, []);

  /**
   * Buscar item por nombre
   */
  const findItemByName = useCallback((name: string) => {
    return inventoryService.findItemByName(name);
  }, []);

  /**
   * Verificar si hay espacio
   */
  const hasSpace = useCallback(() => {
    return inventoryService.hasSpace();
  }, []);

  /**
   * Obtener estadísticas totales
   */
  const getTotalStats = useCallback(() => {
    return inventoryService.getTotalStats();
  }, []);

  /**
   * Agregar items de prueba
   */
  const addTestItems = useCallback(() => {
    console.log('🧪 Agregando items de prueba...');
    DEFAULT_ITEMS.forEach(item => {
      addItem(item);
    });
  }, [addItem]);

  /**
   * Limpiar inventario
   */
  const clearInventory = useCallback(() => {
    console.log('🗑️ Limpiando inventario...');
    inventory.items.forEach(item => {
      inventoryService.removeItem(item.id, item.quantity);
    });
    setInventory(inventoryService.getInventory());
    setEquipment(inventoryService.getEquipment());
  }, [inventory.items]);

  /**
   * Obtener item por ID
   */
  const getItemById = useCallback((itemId: string) => {
    return inventory.items.find(item => item.id === itemId);
  }, [inventory.items]);

  /**
   * Obtener cantidad de un item específico
   */
  const getItemQuantity = useCallback((itemId: string) => {
    const item = inventory.items.find(item => item.itemId === itemId);
    return item ? item.quantity : 0;
  }, [inventory.items]);

  /**
   * Verificar si tiene un item específico
   */
  const hasItem = useCallback((itemId: string, quantity: number = 1) => {
    const item = inventory.items.find(item => item.itemId === itemId);
    return item ? item.quantity >= quantity : false;
  }, [inventory.items]);

  return {
    // Estado
    inventory,
    equipment,
    isLoading,
    
    // Acciones
    addItem,
    removeItem,
    equipItem,
    unequipItem,
    consumeItem,
    addGold,
    removeGold,
    
    // Utilidades
    getItemsByType,
    getItemsByRarity,
    findItemByName,
    hasSpace,
    getTotalStats,
    getItemById,
    getItemQuantity,
    hasItem,
    
    // Debug/Testing
    addTestItems,
    clearInventory
  };
}
