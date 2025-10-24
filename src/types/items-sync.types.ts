import { InventoryItem } from './inventory.types';

export interface WorldItemState {
  id: string; // spawn id
  mapId: string;
  position: { x: number; y: number; z: number };
  item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
  isCollected: boolean;
}

// Server -> Client
export interface ItemsStateResponse {
  mapId: string;
  items: WorldItemState[];
}

export interface ItemsUpdateResponse {
  mapId: string;
  spawnId: string;
  isCollected: boolean;
  position?: { x: number; y: number; z: number };
}

// Client -> Server
export interface ItemsRequest {
  mapId: string;
}

export interface ItemCollectRequest {
  mapId: string;
  spawnId: string;
}

export type ItemsEventCallback<T> = (data: T) => void;
export type ItemsStateCallback = ItemsEventCallback<ItemsStateResponse>;
export type ItemsUpdateCallback = ItemsEventCallback<ItemsUpdateResponse>;
export interface ItemCollectedResponse {
  mapId: string;
  spawnId: string;
  item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
}
export type ItemCollectedCallback = ItemsEventCallback<ItemCollectedResponse>;


