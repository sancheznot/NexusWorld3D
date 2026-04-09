import { colyseusClient } from './client';
import {
  ItemsRequest,
  ItemCollectRequest,
  ItemDropRequest,
  ItemsSpawnMessage,
  ItemsStateResponse,
  ItemsUpdateResponse,
  ItemsStateCallback,
  ItemsUpdateCallback,
  ItemCollectedResponse,
  ItemCollectedCallback,
} from '@/types/items-sync.types';

export class ItemsClient {
  private static instance: ItemsClient;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

  private constructor() {
    this.bindToRoomLifecycle();
  }

  public static getInstance(): ItemsClient {
    if (!ItemsClient.instance) {
      ItemsClient.instance = new ItemsClient();
    }
    return ItemsClient.instance;
  }

  private bindToRoomLifecycle() {
    colyseusClient.on('room:connected', () => this.setupEventListeners());
    colyseusClient.on('room:left', () => this.removeAllListeners());
  }

  private setupEventListeners() {
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    const room = colyseusClient.getSocket();
    if (!room) return;

    room.onMessage('items:state', (data: ItemsStateResponse) => this.emit('items:state', data));
    room.onMessage('items:update', (data: ItemsUpdateResponse) => this.emit('items:update', data));
    room.onMessage('items:collected', (data: ItemCollectedResponse) => this.emit('items:collected', data));
    room.onMessage('items:spawn', (data: ItemsSpawnMessage) => this.emit('items:spawn', data));
  }

  // Send
  public requestItems(data: ItemsRequest): void {
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    colyseusClient.getSocket()?.send('items:request', data);
  }
  public collectItem(data: ItemCollectRequest): void {
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    colyseusClient.getSocket()?.send('items:collect', data);
  }

  public dropItemToWorld(data: ItemDropRequest): void {
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    colyseusClient.getSocket()?.send('items:drop', data);
  }

  // On
  public onItemsState(callback: ItemsStateCallback): void { this.on('items:state', callback); }
  public onItemsUpdate(callback: ItemsUpdateCallback): void { this.on('items:update', callback); }
  public onItemsCollected(callback: ItemCollectedCallback): void { this.on('items:collected', callback); }
  public onItemsSpawn(callback: (data: ItemsSpawnMessage) => void): void {
    this.on('items:spawn', callback as (data: unknown) => void);
  }

  // Event system
  public on(event: 'items:state', callback: ItemsStateCallback): void;
  public on(event: 'items:update', callback: ItemsUpdateCallback): void;
  public on(event: 'items:collected', callback: ItemCollectedCallback): void;
  public on(event: 'items:spawn', callback: (data: ItemsSpawnMessage) => void): void;
  public on(event: string, callback: ItemsStateCallback | ItemsUpdateCallback | ItemCollectedCallback | ((data: ItemsSpawnMessage) => void)): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(callback as (data: unknown) => void);
  }
  public off(event: 'items:state', callback?: ItemsStateCallback): void;
  public off(event: 'items:update', callback?: ItemsUpdateCallback): void;
  public off(event: 'items:collected', callback?: ItemCollectedCallback): void;
  public off(event: 'items:spawn', callback?: (data: ItemsSpawnMessage) => void): void;
  public off(event: string, callback?: ItemsStateCallback | ItemsUpdateCallback | ItemCollectedCallback | ((data: ItemsSpawnMessage) => void)): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    if (!callback) { this.eventListeners.delete(event); return; }
    const cb = callback as (data: unknown) => void;
    const i = listeners.indexOf(cb);
    if (i > -1) listeners.splice(i, 1);
  }
  public emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.forEach(cb => cb(data));
  }
  public removeAllListeners(): void { this.eventListeners.clear(); }
}

export const itemsClient = ItemsClient.getInstance();
export default itemsClient;


