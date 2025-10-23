import { InventoryItem, Inventory } from './inventory.types';

/**
 * Tipos para sincronización de inventario con Colyseus
 */

// Respuestas del servidor
export interface InventoryResponse {
  playerId: string;
  inventory: Inventory;
  timestamp: number;
}

export interface ItemUpdateResponse {
  playerId: string;
  item: InventoryItem;
  action: 'add' | 'remove' | 'update' | 'use' | 'equip' | 'unequip';
  timestamp: number;
}

export interface GoldUpdateResponse {
  playerId: string;
  amount: number;
  change: number;
  reason: string;
  timestamp: number;
}

export interface InventoryErrorResponse {
  message: string;
  code?: string;
  timestamp: number;
}

// Eventos del cliente al servidor
export interface InventoryUpdateRequest {
  items: InventoryItem[];
}

export interface ItemAddRequest {
  item: InventoryItem;
}

export interface ItemRemoveRequest {
  itemId: string;
  quantity?: number;
}

export interface ItemUseRequest {
  itemId: string;
  slot: number;
}

export interface ItemEquipRequest {
  itemId: string;
  slot: string;
}

export interface ItemUnequipRequest {
  itemType: string;
}

export interface GoldUpdateRequest {
  amount: number;
  operation: 'add' | 'remove';
}

export interface ItemDropRequest {
  itemId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

// Eventos de inventario
export type InventoryEventType = 
  | 'inventory:updated'
  | 'inventory:item-added'
  | 'inventory:item-removed'
  | 'inventory:item-used'
  | 'inventory:item-equipped'
  | 'inventory:item-unequipped'
  | 'inventory:gold-updated'
  | 'inventory:data'
  | 'inventory:error';

// Callback types
export type InventoryEventCallback<T = any> = (data: T) => void;
export type InventoryUpdatedCallback = InventoryEventCallback<InventoryResponse>;
export type ItemUpdateCallback = InventoryEventCallback<ItemUpdateResponse>;
export type GoldUpdateCallback = InventoryEventCallback<GoldUpdateResponse>;
export type InventoryErrorCallback = InventoryEventCallback<InventoryErrorResponse>;
