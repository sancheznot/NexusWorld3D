export interface PlayerCustomization {
  bodyColor: string;
  headColor: string;
  eyeColor: string;
  bodyType: 'normal' | 'muscular' | 'slim';
  headType: 'normal' | 'big' | 'small';
  height: number;
  modelType: 'men' | 'woman' | 'custom';
  customBaseModel?: 'men' | 'woman';
}

export interface Player {
  id: string;
  username: string;
  position: Vector3;
  rotation: Vector3;
  mapId?: string; // mapa actual del jugador
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  hunger?: number;
  maxHunger?: number;
  level: number;
  experience: number;
  worldId: string;
  isOnline: boolean;
  lastSeen: Date;
  customization?: PlayerCustomization;
  // Multiplayer runtime fields (optional)
  animation?: string;        // 'idle' | 'walking' | 'running' | etc.
  isMoving?: boolean;
  isRunning?: boolean;
  lastUpdate?: number;       // server timestamp (ms)
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerStats {
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
  luck: number;
}

export interface PlayerMovement {
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  isMoving: boolean;
  isRunning: boolean;
  isJumping: boolean;
}

export interface PlayerAnimation {
  current: string;
  isPlaying: boolean;
  speed: number;
}
