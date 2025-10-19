// Cliente -> Servidor Events
export interface ClientToServerEvents {
  // Player events
  'player:join': (data: { playerId: string; username: string; worldId: string }) => void;
  'player:leave': () => void;
  'player:move': (data: PlayerMovementData) => void;
  'player:attack': (data: { targetId: string; damage: number }) => void;
  'player:interact': (data: { objectId: string; action: string }) => void;
  'player:levelup': (data: { newLevel: number; stats: any }) => void;

  // Chat events
  'chat:message': (data: { message: string; channel: string }) => void;
  'chat:join-channel': (data: { channel: string }) => void;
  'chat:leave-channel': (data: { channel: string }) => void;

  // Inventory events
  'inventory:update': (data: { items: any[] }) => void;
  'inventory:use-item': (data: { itemId: string; slot: number }) => void;
  'inventory:drop-item': (data: { itemId: string; position: Vector3 }) => void;

  // World events
  'world:change': (data: { worldId: string }) => void;
  'world:request-data': (data: { worldId: string }) => void;

  // Combat events
  'combat:attack': (data: { targetId: string; skillId?: string }) => void;
  'combat:defend': (data: { isDefending: boolean }) => void;
  'combat:use-skill': (data: { skillId: string; targetId?: string }) => void;
}

// Servidor -> Cliente Events
export interface ServerToClientEvents {
  // Player events
  'player:joined': (data: { player: Player; players: Player[] }) => void;
  'player:left': (data: { playerId: string; players: Player[] }) => void;
  'player:moved': (data: { playerId: string; movement: PlayerMovementData }) => void;
  'player:attacked': (data: { attackerId: string; targetId: string; damage: number }) => void;
  'player:damaged': (data: { playerId: string; damage: number; newHealth: number }) => void;
  'player:died': (data: { playerId: string; respawnTime: number }) => void;
  'player:respawned': (data: { playerId: string; position: Vector3 }) => void;
  'player:levelup': (data: { playerId: string; newLevel: number; stats: any }) => void;

  // Chat events
  'chat:message': (data: { playerId: string; username: string; message: string; channel: string; timestamp: Date }) => void;
  'chat:system': (data: { message: string; type: 'info' | 'warning' | 'error' }) => void;

  // World events
  'world:update': (data: { world: World; players: Player[]; objects: WorldObject[] }) => void;
  'world:changed': (data: { worldId: string; spawnPoint: Vector3 }) => void;

  // Monster events
  'monster:spawned': (data: { monster: Monster }) => void;
  'monster:died': (data: { monsterId: string; position: Vector3; loot: any[] }) => void;
  'monster:moved': (data: { monsterId: string; position: Vector3; targetId?: string }) => void;

  // System events
  'system:error': (data: { message: string; code: string }) => void;
  'system:maintenance': (data: { message: string; startTime: Date; endTime: Date }) => void;
}

// Data types
export interface PlayerMovementData {
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  isMoving: boolean;
  isRunning: boolean;
  isJumping: boolean;
  timestamp: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  id: string;
  username: string;
  position: Vector3;
  rotation: Vector3;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  experience: number;
  worldId: string;
  isOnline: boolean;
  lastSeen: Date;
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

export interface Monster {
  id: string;
  type: string;
  position: Vector3;
  health: number;
  maxHealth: number;
  level: number;
  isAlive: boolean;
  targetId?: string;
  lastAttack: Date;
}
