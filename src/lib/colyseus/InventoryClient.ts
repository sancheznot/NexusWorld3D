import { colyseusClient } from './client';
import { Inventory } from '@/types/inventory.types';
import {
  InventoryResponse,
  InventoryErrorResponse,
  InventoryEventCallback,
  InventoryUpdatedCallback,
  InventoryErrorCallback
} from '@/types/inventory-sync.types';

/**
 * Cliente de Inventario para Colyseus
 * Maneja la comunicación del inventario entre cliente y servidor
 */

export class InventoryClient {
  private static instance: InventoryClient;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  private constructor() {
    this.bindToRoomLifecycle();
  }

  public static getInstance(): InventoryClient {
    if (!InventoryClient.instance) {
      InventoryClient.instance = new InventoryClient();
    }
    return InventoryClient.instance;
  }

  /**
   * Configurar event listeners para respuestas del servidor
   */
  private setupEventListeners() {
    const room = colyseusClient.getSocket();
    if (!room) return;

    // Inventario actualizado
    room.onMessage('inventory:updated', (data: InventoryResponse) => {
      this.emit('inventory:updated', data);
    });

    // Error de inventario
    room.onMessage('inventory:error', (data: InventoryErrorResponse) => {
      this.emit('inventory:error', data);
    });

    // Datos de inventario actuales
    room.onMessage('inventory:data', (data: Inventory) => {
      this.emit('inventory:data', data);
    });
  }

  /**
   * Re-suscribirse automáticamente cuando la room conecta/reconecta
   */
  private bindToRoomLifecycle() {
    // Al conectar una room
    colyseusClient.on('room:connected', () => {
      this.setupEventListeners();
    });

    // Si se deja la room, no hacemos nada especial; al reconectar volverá a suscribirse
    colyseusClient.on('room:left', () => {
      // Opcional: limpiar listeners internos si fuera necesario
    });
  }

  /**
   * Enviar inventario completo al servidor
   */
  public updateInventory(inventory: Inventory): void {
    const room = colyseusClient.getSocket();
    room?.send('inventory:update', { items: inventory.items });
  }

  /**
   * Usar item
   */
  public useItem(itemId: string, slot: number): void {
    const room = colyseusClient.getSocket();
    room?.send('inventory:use-item', { itemId, slot });
  }

  /**
   * Dropear item
   */
  public dropItem(itemId: string, position: any): void {
    const room = colyseusClient.getSocket();
    room?.send('inventory:drop-item', { itemId, position });
  }

  /**
   * Event system - Métodos tipados
   */
  public onInventoryUpdated(callback: InventoryUpdatedCallback): void {
    this.on('inventory:updated', callback);
  }

  public onInventoryData(callback: InventoryEventCallback<Inventory>): void {
    this.on('inventory:data', callback);
  }

  public onInventoryError(callback: InventoryErrorCallback): void {
    this.on('inventory:error', callback);
  }

  /**
   * Event system genérico
   */
  public on(event: string, callback: InventoryEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: InventoryEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners && callback) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public removeAllListeners(): void {
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const inventoryClient = InventoryClient.getInstance();
export default inventoryClient;
