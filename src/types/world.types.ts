export interface World {
  id: string;
  name: string;
  type: WorldType;
  maxPlayers: number;
  currentPlayers: number;
  spawnPoint: Vector3;
  bounds: WorldBounds;
  isActive: boolean;
  createdAt: Date;
}

export type WorldType = 'hotel' | 'combat' | 'social' | 'pvp' | 'dungeon';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldBounds {
  min: Vector3;
  max: Vector3;
}

export interface WorldObject {
  id: string;
  type: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  isInteractable: boolean;
  data?: Record<string, any>;
}

export interface SpawnPoint {
  id: string;
  position: Vector3;
  rotation: Vector3;
  isActive: boolean;
  worldId: string;
}
