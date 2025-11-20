import type { TriggerZoneData } from '@/types/trigger.types';
import type { ExtendedJobId } from './jobs';

export type NPCId = 'npc_grocer' | 'npc_blacksmith' | 'npc_doctor' | 'npc_bank_clerk' | 'npc_super_grocer' | 'npc_delivery_manager';

export interface NPCConfig {
  id: NPCId;
  name: string;
  mapId: string; // 'exterior' | 'hotel-interior' | 'police-station' | ...
  zone: Omit<TriggerZoneData, 'id' | 'kind' | 'name'> & { radius: number };
  opensShopId?: string; // from SHOPS
  jobId?: ExtendedJobId;
  visual?: {
    path: string; // /models/... .glb
    type: 'glb' | 'gltf' | 'fbx' | 'obj';
    scale?: number;
    rotation?: [number, number, number];
  };
}

export const NPCS: Record<NPCId, NPCConfig> = {
  npc_grocer: {
    id: 'npc_grocer',
    name: 'Vendedor',
    mapId: 'exterior',
    zone: { position: { x: -12, y: 1, z: 28 }, radius: 2 },
    opensShopId: 'general_store',
    visual: { path: '/models/characters/men/men_01.glb', type: 'glb', scale: 1 }
  },
  npc_blacksmith: {
    id: 'npc_blacksmith',
    name: 'Herrero',
    mapId: 'hotel-interior',
    zone: { position: { x: 3, y: 1, z: 6 }, radius: 2 },
    opensShopId: 'blacksmith',
    visual: { path: '/models/characters/men/men_02.glb', type: 'glb', scale: 1 }
  },
  npc_doctor: {
    id: 'npc_doctor',
    name: 'Doctor',
    mapId: 'hospital',
    zone: { position: { x: 1, y: 1, z: 3 }, radius: 2 },
    opensShopId: 'hospital',
    visual: { path: '/models/characters/women/women_01.glb', type: 'glb', scale: 1 }
  },
  npc_bank_clerk: {
    id: 'npc_bank_clerk',
    name: 'Cajero',
    mapId: 'bank',
    zone: { position: { x: 0, y: 1, z: 0 }, radius: 2 },
    visual: { path: '/models/characters/men/men_03.glb', type: 'glb', scale: 1 }
  },
  npc_super_grocer: {
    id: 'npc_super_grocer',
    name: 'Encargado del Super',
    mapId: 'supermarket',
    zone: { position: { x: 2, y: 1, z: 4 }, radius: 2 },
    opensShopId: 'supermarket_store',
    visual: { path: '/models/characters/men/men_04.glb', type: 'glb', scale: 1 }
  },
  npc_delivery_manager: {
    id: 'npc_delivery_manager',
    name: 'Coordinador de Entregas',
    mapId: 'exterior',
    zone: { position: { x: 45, y: 1.1, z: -38.5 }, radius: 2.5 },
    jobId: 'delivery',
    visual: { path: '/models/characters/men/men_02.glb', type: 'glb', scale: 1 }
  },
};


