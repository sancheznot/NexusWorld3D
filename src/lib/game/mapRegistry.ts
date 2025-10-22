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
        position: { x: 8.5, y: 1.0, z: 9.4 },
        radius: 1,
        targetMap: 'hotel-interior',
        targetPosition: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏨'
      },
      {
        id: 'police-station-entrance',
        name: 'Comisaría de Policía',
        description: 'Entrar a la estación de policía',
        position: { x: 15, y: 1, z: 5 },
        radius: 3,
        targetMap: 'police-station',
        targetPosition: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚔'
      },
      {
        id: 'hospital-entrance',
        name: 'Hospital',
        description: 'Entrar al hospital de la ciudad',
        position: { x: -25, y: 1, z: 15 },
        radius: 3,
        targetMap: 'hospital',
        targetPosition: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏥'
      },
      {
        id: 'bank-entrance',
        name: 'Banco Central',
        description: 'Entrar al banco para transacciones',
        position: { x: 30, y: 1, z: -20 },
        radius: 3,
        targetMap: 'bank',
        targetPosition: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏦'
      },
      {
        id: 'shop-entrance',
        name: 'Tienda General',
        description: 'Comprar suministros y equipamiento',
        position: { x: -10, y: 1, z: -15 },
        radius: 3,
        targetMap: 'shop',
        targetPosition: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🛒'
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
        targetPosition: { x: 8.5, y: 1.1, z: 9.4 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  },
  {
    id: 'police-station',
    name: 'Comisaría de Policía',
    description: 'Estación de policía de la ciudad',
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      {
        id: 'police-exit',
        name: 'Salida de la Comisaría',
        description: 'Volver al exterior',
        position: { x: 0, y: 0, z: 0 },
        radius: 3,
        targetMap: 'exterior',
        targetPosition: { x: 15, y: 1, z: 5 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    description: 'Hospital de la ciudad',
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      {
        id: 'hospital-exit',
        name: 'Salida del Hospital',
        description: 'Volver al exterior',
        position: { x: 0, y: 0, z: 0 },
        radius: 3,
        targetMap: 'exterior',
        targetPosition: { x: -25, y: 1, z: 15 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  },
  {
    id: 'bank',
    name: 'Banco Central',
    description: 'Banco para transacciones financieras',
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      {
        id: 'bank-exit',
        name: 'Salida del Banco',
        description: 'Volver al exterior',
        position: { x: 0, y: 0, z: 0 },
        radius: 3,
        targetMap: 'exterior',
        targetPosition: { x: 30, y: 1, z: -20 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  },
  {
    id: 'shop',
    name: 'Tienda General',
    description: 'Tienda para comprar suministros',
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      {
        id: 'shop-exit',
        name: 'Salida de la Tienda',
        description: 'Volver al exterior',
        position: { x: 0, y: 0, z: 0 },
        radius: 3,
        targetMap: 'exterior',
        targetPosition: { x: -10, y: 1, z: -15 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  }
]);


