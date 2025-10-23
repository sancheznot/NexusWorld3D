import type { MapData } from '@/types/portal.types';
import type { TriggerZoneData } from '@/types/trigger.types';
import { GAME_CONFIG } from '@/constants/game';

type MapId = string;

// Registro global de mapas del juego
// Cada mapa tiene: spawn, portales, objetos, triggers
const registry = new Map<MapId, MapData & { triggers?: TriggerZoneData[] }>();

/**
 * Registra una lista de mapas en el sistema
 * @param maps Array de mapas con sus configuraciones
 */
export function registerMaps(maps: Array<MapData & { triggers?: TriggerZoneData[] }>) {
  maps.forEach((m) => registry.set(m.id, m));
}

/**
 * Obtiene un mapa específico por su ID
 * @param mapId ID del mapa a buscar
 * @returns Datos del mapa o null si no existe
 */
export function getMap(mapId: MapId) {
  return registry.get(mapId) || null;
}

/**
 * Obtiene todos los mapas registrados
 * @returns Array con todos los mapas disponibles
 */
export function getAllMaps() {
  return Array.from(registry.values());
}

// ===== CONFIGURACIÓN DE MAPAS =====
// Aquí se definen todos los mapas del juego con sus portales y configuraciones

registerMaps([
  // ===== MAPA EXTERIOR (CIUDAD) =====
  {
    id: 'exterior',
    name: 'Exterior del Hotel',
    description: 'El área exterior del icónico Hotel Humboldt',
    // Posición donde aparece el jugador al entrar a este mapa
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      // Portal de entrada al hotel
      {
        id: 'hotel-entrance',
        name: 'Entrada del Hotel',
        description: 'Entrar al interior del Hotel Humboldt',
        // Posición del portal en el mundo exterior
        position: { x: 8.5, y: 1.0, z: 9.4 },
        radius: 1, // Radio de activación del portal
        targetMap: 'hotel-interior', // Mapa destino
        // Posición ligeramente fuera del radio del portal para evitar activación inmediata
        targetPosition: { x: 6.0, y: 1.0, z: 7.0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏨'
      },
      // Otros portales en el exterior (policía, hospital, banco, tienda)
      {
        id: 'police-station-entrance',
        name: 'Comisaría de Policía',
        description: 'Entrar a la estación de policía',
        position: { x: 15, y: 1, z: 5 },
        radius: 1,
        targetMap: 'police-station',
        // MISMA POSICIÓN: El jugador aparece en la misma posición donde está el portal
        targetPosition: { x: 15, y: 1, z: 5 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚔'
      },
      {
        id: 'hospital-entrance',
        name: 'Hospital',
        description: 'Entrar al hospital de la ciudad',
        position: { x: -25, y: 1, z: 15 },
        radius: 1,
        targetMap: 'hospital',
        // MISMA POSICIÓN: El jugador aparece en la misma posición donde está el portal
        targetPosition: { x: -25, y: 1, z: 15 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏥'
      },
      {
        id: 'bank-entrance',
        name: 'Banco Central',
        description: 'Entrar al banco para transacciones',
        position: { x: 30, y: 1, z: -20 },
        radius: 1,
        targetMap: 'bank',
        // MISMA POSICIÓN: El jugador aparece en la misma posición donde está el portal
        targetPosition: { x: 30, y: 1, z: -20 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🏦'
      },
      {
        id: 'shop-entrance',
        name: 'Tienda General',
        description: 'Comprar suministros y equipamiento',
        position: { x: -10, y: 1, z: -15 },
        radius: 1,
        targetMap: 'shop',
        // MISMA POSICIÓN: El jugador aparece en la misma posición donde está el portal
        targetPosition: { x: -10, y: 1, z: -15 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🛒'
      }
    ],
    objects: [], // Objetos 3D en este mapa
    triggers: [
      // Zonas de interacción (ej: banco, NPCs, etc.)
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
  // ===== MAPA INTERIOR DEL HOTEL =====
  {
    id: 'hotel-interior',
    name: 'Interior del Hotel',
    description: 'El lujoso interior del Hotel Humboldt',
    // Posición donde aparece el jugador al entrar al hotel
    spawnPosition: { x: 0, y: 0, z: 0 },
    spawnRotation: { x: 0, y: 0, z: 0 },
    portals: [
      // Portal de salida del hotel
      {
        id: 'hotel-exit',
        name: 'Salida del Hotel',
        description: 'Volver al exterior',
        // Portal está en el interior del hotel
        position: { x: 3.0, y: 1.0, z: 7.0 },
        radius: 1,
        targetMap: 'exterior', // Vuelve al mapa exterior
        // Apareces en el exterior donde está el portal de entrada
        targetPosition: { x: 0.5, y: 1.0, z: 35.0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [], // Objetos 3D del interior del hotel
  },
  // ===== OTROS MAPAS INTERIORES =====
  // Cada uno tiene su portal de salida que te lleva de vuelta al exterior
  // en la misma posición donde está el portal de entrada
  
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
        // Portal está en el interior de la comisaría
        position: { x: 12.5, y: 1, z: 2.5 },
        radius: 1,
        targetMap: 'exterior',
        // Apareces en el exterior donde está el portal de entrada
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
        // Portal está en el interior del hospital
        position: { x: -22, y: 1, z: 12 },
        radius: 1,
        targetMap: 'exterior',
        // Apareces en el exterior donde está el portal de entrada
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
        // Portal está en el interior del banco
        position: { x: 27, y: 1, z: -17 },
        radius: 1,
        targetMap: 'exterior',
        // Apareces en el exterior donde está el portal de entrada
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
        // Portal está en el interior de la tienda
        position: { x: -7, y: 1, z: -12 },
        radius: 1,
        targetMap: 'exterior',
        // Apareces en el exterior donde está el portal de entrada
        targetPosition: { x: -10, y: 1, z: -15 },
        targetRotation: { x: 0, y: 0, z: 0 },
        isActive: true,
        icon: '🚪'
      }
    ],
    objects: [],
  }
]);

// ===== EXPLICACIÓN DEL SISTEMA =====
/*
CÓMO FUNCIONA EL SISTEMA DE MAPAS:

1. REGISTRO DE MAPAS:
   - Cada mapa tiene un ID único (ej: 'exterior', 'hotel-interior')
   - Se registran en un Map global para acceso rápido

2. ESTRUCTURA DE CADA MAPA:
   - spawnPosition/spawnRotation: Donde aparece el jugador al entrar
   - portals: Array de portales que conectan con otros mapas
   - objects: Objetos 3D específicos del mapa
   - triggers: Zonas de interacción (NPCs, bancos, etc.)

3. SISTEMA DE PORTALES:
   - position: Dónde está el portal en el mundo actual
   - radius: Radio de activación (cuando te acercas)
   - targetMap: Mapa destino
   - targetPosition: Dónde apareces en el mapa destino
   - Si targetPosition es {0,0,0}, usa el spawnPosition del mapa destino

4. FLUJO DE TELEPORTACIÓN:
   - Jugador se acerca al portal → se activa
   - Se limpian colliders del mapa actual
   - Se cambia al mapa destino
   - Se posiciona al jugador en targetPosition o spawnPosition
   - Se cargan colliders del nuevo mapa

5. ENTRADA/SALIDA SIMÉTRICA:
   - Portal de entrada: exterior → interior
   - Portal de salida: interior → exterior (misma posición de entrada)
   - Esto crea un flujo natural de ida y vuelta

EJEMPLO HOTEL:
- Entrada exterior: posición (8.5, 1.0, 9.4) → hotel-interior en (8.5, 1.0, 9.4)
- Salida interior: hotel-interior en (8.5, 1.0, 9.4) → exterior en (8.5, 1.0, 9.4)
- El jugador siempre aparece en la misma posición donde está el portal
*/

// ===== SYSTEM EXPLANATION =====
/*
HOW THE MAP SYSTEM WORKS:

1. MAP REGISTRATION:
   - Each map has a unique ID (e.g. 'exterior', 'hotel-interior')
   - They are registered in a global Map for fast access

2. MAP STRUCTURE:
   - spawnPosition/spawnRotation: Where the player appears when entering
   - portals: Array of portals that connect to other maps
   - objects: 3D objects specific to the map
   - triggers: Interaction zones (NPCs, banks, etc.)

3. PORTAL SYSTEM:
   - position: Where the portal is in the current world
   - radius: Activation radius (when you get close)
   - targetMap: Destination map
   - targetPosition: Where you appear in the destination map
   - If targetPosition is {0,0,0}, uses the destination map's spawnPosition

4. TELEPORTATION FLOW:
   - Player approaches portal → activates
   - Current map colliders are cleared
   - Changes to destination map
   - Player is positioned at targetPosition or spawnPosition
   - New map colliders are loaded

5. SYMMETRIC ENTRY/EXIT:
   - Entry portal: exterior → interior
   - Exit portal: interior → exterior (same entry position)
   - This creates a natural back-and-forth flow

HOTEL EXAMPLE:
- Exterior entry: position (8.5, 1.0, 9.4) → hotel-interior at (8.5, 1.0, 9.4)
- Interior exit: hotel-interior at (8.5, 1.0, 9.4) → exterior at (8.5, 1.0, 9.4)
- Player always appears at the same position where the portal is located
*/
