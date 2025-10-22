import type { MapData } from '@/types/portal.types';
import type { TriggerZoneData } from '@/types/trigger.types';
import { GAME_CONFIG } from '@/constants/game';

type MapId = string;

const registry = new Map<MapId, MapData & { triggers?: TriggerZoneData[] }>();

export function registerMaps(maps: Array<MapData & { triggers?: TriggerZoneData[] }>) {
  maps.forEach((m) => registry.set(m.id, m));
}

export function getMap(mapId: MapId) {
  return registry.get(mapId) || null;
}

export function getAllMaps() {
  return Array.from(registry.values());
}

// Default bootstrap
registerMaps([
  {
    id: 'exterior',
    name: 'Exterior del Hotel',
    description: 'El área exterior del icónico Hotel Humboldt',
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      {
        id: 'hotel-entrance',
        name: 'Entrada del Hotel',
        description: 'Entrar al interior del Hotel Humboldt',
        position: { x: 52, y: 1, z: -39.55 },
        radius: 3,
        targetMap: 'hotel-interior',
        targetPosition: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏨'
      }
    ],
    objects: [],
    triggers: [
      {
        id: 'bank-exterior-1',
        kind: 'bank',
        name: 'Banco',
        position: { x: 30, y: 0, z: -20 },
        radius: GAME_CONFIG.triggers.defaultRadius,
        data: { branchId: 'humboldt-01' },
      }
    ],
  },
  {
    id: 'hotel-interior',
    name: 'Interior del Hotel',
    description: 'El lujoso interior del Hotel Humboldt',
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      {
        id: 'hotel-exit',
        name: 'Salida del Hotel',
        description: 'Volver al exterior',
        position: { x: 0, y: 0, z: 0 },
        radius: 3,
        targetMap: 'exterior',
        targetPosition: { x: 0, y: 0, z: -100 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  }
]);


