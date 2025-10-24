import { useState, useEffect, useCallback } from 'react';
import { inventoryService, DEFAULT_ITEMS } from '@/lib/services/inventory';
import { InventoryItem, Inventory, Equipment, ItemType, ItemRarity } from '@/types/inventory.types';

/**
 * Hook para gestionar el inventario del jugador
 * Proporciona funciones para agregar, remover, equipar y usar items
 */
export function useInventory() {
  const [inventory, setInventory] = useState<Inventory>(() => inventoryService.getInventory());
  const [equipment, setEquipment] = useState<Equipment>(() => inventoryService.getEquipment());
  const [isLoading, setIsLoading] = useState(false);

  // Suscribirse a cambios del servicio (snapshots desde servidor, level up, oro)
  useEffect(() => {
    const unsub = inventoryService.subscribe(() => {
      setInventory(inventoryService.getInventory());
      setEquipment(inventoryService.getEquipment());
    });
    return unsub;
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
      const success = inventoryService.useItem(itemId);
      if (success) {
        setInventory(inventoryService.getInventory());
        console.log(`✅ Item usado: ${itemId}`);
      }
      return success;
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
