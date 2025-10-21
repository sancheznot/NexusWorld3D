export interface Portal {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number; z: number };
  radius: number; // Radio de activación
  targetMap: string;
  targetPosition: { x: number; y: number; z: number };
  targetRotation: { x: number; y: number; z: number };
  isActive: boolean;
  icon?: string; // Icono para la UI
}

export interface MapData {
  id: string;
  name: string;
  description: string;
  spawnPosition: { x: number; y: number; z: number };
  spawnRotation: { x: number; y: number; z: number };
  portals: Portal[];
  objects: any[]; // Objetos del mapa
}

export interface PortalEvent {
  type: 'portal_enter' | 'portal_exit' | 'map_change';
  playerId: string;
  portalId?: string;
  fromMap: string;
  toMap: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}
