import { colyseusClient } from './client';
import {
  MapChangeRequest,
  MapRequestData,
  MapChangedResponse,
  MapUpdateResponse,
  WorldEventCallback,
  MapChangedCallback,
  MapUpdateCallback,
  WorldErrorResponse,
  WorldErrorCallback,
} from '@/types/world-sync.types';

/**
 * WorldClient
 * Cliente modular para sincronizar cambios de mapa/mundo mediante Colyseus.
 * Sigue el mismo patrón de InventoryClient: singleton, auto-resuscripción y
 * sistema de eventos tipado.
 */
export class WorldClient {
  private static instance: WorldClient;
  private eventListeners: Map<string, WorldEventCallback<any>[]> = new Map();

  private constructor() {
    this.bindToRoomLifecycle();
  }

  public static getInstance(): WorldClient {
    if (!WorldClient.instance) {
      WorldClient.instance = new WorldClient();
    }
    return WorldClient.instance;
  }

  private bindToRoomLifecycle() {
    colyseusClient.on('room:connected', () => this.setupEventListeners());
    colyseusClient.on('room:left', () => this.removeAllListeners());
  }

  private setupEventListeners() {
    const room = colyseusClient.getSocket();
    if (!room) return;

    // Evitar duplicados tras reconexiones
    this.removeAllListeners();

    // Eventos de mundo/ mapa desde el servidor
    room.onMessage('map:changed', (data: MapChangedResponse) => this.emit('map:changed', data));
    room.onMessage('map:update', (data: MapUpdateResponse) => this.emit('map:update', data));
    room.onMessage('world:error', (data: WorldErrorResponse) => this.emit('world:error', data));
  }

  // Métodos de envío
  public changeMap(data: MapChangeRequest): void {
    colyseusClient.getSocket()?.send('map:change', data);
  }

  public requestMapData(data: MapRequestData): void {
    colyseusClient.getSocket()?.send('map:request', data);
  }

  // Registro de listeners tipados
  public onMapChanged(callback: MapChangedCallback): void {
    this.on('map:changed', callback);
  }

  public onMapUpdate(callback: MapUpdateCallback): void {
    this.on('map:update', callback);
  }

  public onWorldError(callback: WorldErrorCallback): void {
    this.on('world:error', callback);
  }

  // Sistema de eventos genérico (igual patrón que InventoryClient)
  public on(event: string, callback: WorldEventCallback<any>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: WorldEventCallback<any>): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  }

  public emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.forEach(cb => cb(data));
  }

  public removeAllListeners(): void {
    this.eventListeners.clear();
  }
}

export const worldClient = WorldClient.getInstance();
export default worldClient;


