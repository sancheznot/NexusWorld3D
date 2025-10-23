export interface MapChangeRequest {
  playerId?: string; // opcional, servidor usa sessionId si no viene
  fromMapId: string;
  toMapId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  reason?: 'portal' | 'admin' | 'respawn' | 'other';
}

export interface MapRequestData {
  mapId: string;
}

export interface MapChangedResponse {
  playerId: string;
  mapId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  timestamp: number;
}

export interface MapUpdateResponse {
  players: Array<{
    id: string;
    mapId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
  mapId: string;
  timestamp: number;
}

export interface WorldErrorResponse {
  message: string;
  code?: string;
  timestamp: number;
}

export type WorldEventCallback<T> = (data: T) => void;
export type MapChangedCallback = WorldEventCallback<MapChangedResponse>;
export type MapUpdateCallback = WorldEventCallback<MapUpdateResponse>;
export type WorldErrorCallback = WorldEventCallback<WorldErrorResponse>;


