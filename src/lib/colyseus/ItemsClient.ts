import { colyseusClient } from './client';
import {
  ItemsRequest,
  ItemCollectRequest,
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
    const room = colyseusClient.getSocket();
    if (!room) return;

    room.onMessage('items:state', (data: ItemsStateResponse) => this.emit('items:state', data));
    room.onMessage('items:update', (data: ItemsUpdateResponse) => this.emit('items:update', data));
    room.onMessage('items:collected', (data: ItemCollectedResponse) => this.emit('items:collected', data));
  }

  // Send
  public requestItems(data: ItemsRequest): void {
    colyseusClient.getSocket()?.send('items:request', data);
  }
  public collectItem(data: ItemCollectRequest): void {
    colyseusClient.getSocket()?.send('items:collect', data);
  }

  // On
  public onItemsState(callback: ItemsStateCallback): void { this.on('items:state', callback); }
  public onItemsUpdate(callback: ItemsUpdateCallback): void { this.on('items:update', callback); }
  public onItemsCollected(callback: ItemCollectedCallback): void { this.on('items:collected', callback); }

  // Event system
  public on(event: 'items:state', callback: ItemsStateCallback): void;
  public on(event: 'items:update', callback: ItemsUpdateCallback): void;
  public on(event: 'items:collected', callback: ItemCollectedCallback): void;
  public on(event: string, callback: ItemsStateCallback | ItemsUpdateCallback | ItemCollectedCallback): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(callback as (data: unknown) => void);
  }
  public off(event: 'items:state', callback?: ItemsStateCallback): void;
  public off(event: 'items:update', callback?: ItemsUpdateCallback): void;
  public off(event: 'items:collected', callback?: ItemCollectedCallback): void;
  public off(event: string, callback?: ItemsStateCallback | ItemsUpdateCallback | ItemCollectedCallback): void {
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


