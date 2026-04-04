'use client';

import { useCallback, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';

interface TeleportLocation {
  name: string;
  position: { x: number; y: number; z: number };
  description?: string;
}

// Ubicaciones predefinidas para teletransportación
const TELEPORT_LOCATIONS: TeleportLocation[] = [
  {
    name: "Edificio demo (exterior)",
    position: { x: 8.5, y: 1.0, z: 9.4 },
    description: "Entrada del edificio demo",
  },
  {
    name: "Edificio demo (interior)",
    position: { x: 6.0, y: 1.0, z: 7.0 },
    description: "Interior del edificio demo",
  },
  {
    name: 'Policía',
    position: { x: 15, y: 1, z: 5 },
    description: 'Comisaría de Policía'
  },
  {
    name: 'Hospital',
    position: { x: -25, y: 1, z: 15 },
    description: 'Hospital de la Ciudad'
  },
  {
    name: 'Banco',
    position: { x: 30, y: 1, z: -20 },
    description: 'Banco Central'
  },
  {
    name: 'Tienda',
    position: { x: -10, y: 1, z: -15 },
    description: 'Tienda General'
  },
  {
    name: 'Centro Ciudad',
    position: { x: 0, y: 1, z: 0 },
    description: 'Centro de la ciudad'
  },
  {
    name: 'Norte',
    position: { x: 0, y: 1, z: 50 },
    description: 'Zona Norte'
  },
  {
    name: 'Sur',
    position: { x: 0, y: 1, z: -50 },
    description: 'Zona Sur'
  },
  {
    name: 'Este',
    position: { x: 50, y: 1, z: 0 },
    description: 'Zona Este'
  },
  {
    name: 'Oeste',
    position: { x: -50, y: 1, z: 0 },
    description: 'Zona Oeste'
  }
];

export function useAdminTeleport() {
  const { updatePosition, updateRotation } = usePlayerStore();

  // Verificar si estamos en modo desarrollo o admin
  const isAdminMode = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && window.location.search.includes('admin=true'));

  const teleportTo = useCallback((location: TeleportLocation) => {
    if (!isAdminMode) {
      console.warn('⚠️ Teletransportación solo disponible en modo admin/desarrollo');
      return;
    }

    const physics = getPhysicsInstance();
    if (!physics) {
      console.warn('⚠️ Physics no disponible para teletransportación');
      return;
    }

    console.log(`🚀 ADMIN TELEPORT: ${location.name} -> (${location.position.x}, ${location.position.y}, ${location.position.z})`);
    
    // Actualizar posición en el store
    updatePosition(location.position);
    updateRotation({ x: 0, y: 0, z: 0 });
    
    // Teleportar físicamente al jugador
    physics.teleportPlayer(location.position, { x: 0, y: 0, z: 0 });
  }, [isAdminMode, updatePosition, updateRotation]);

  // Sistema de teclas para teletransportación rápida
  useEffect(() => {
    if (!isAdminMode) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Solo activar si Ctrl está presionado
      if (!event.ctrlKey) return;

      switch (event.key) {
        case '1':
          teleportTo(TELEPORT_LOCATIONS[0]); // Hotel Exterior
          break;
        case '2':
          teleportTo(TELEPORT_LOCATIONS[1]); // Hotel Interior
          break;
        case '3':
          teleportTo(TELEPORT_LOCATIONS[2]); // Policía
          break;
        case '4':
          teleportTo(TELEPORT_LOCATIONS[3]); // Hospital
          break;
        case '5':
          teleportTo(TELEPORT_LOCATIONS[4]); // Banco
          break;
        case '6':
          teleportTo(TELEPORT_LOCATIONS[5]); // Tienda
          break;
        case '0':
          teleportTo(TELEPORT_LOCATIONS[6]); // Centro
          break;
        case 'ArrowUp':
          teleportTo(TELEPORT_LOCATIONS[7]); // Norte
          break;
        case 'ArrowDown':
          teleportTo(TELEPORT_LOCATIONS[8]); // Sur
          break;
        case 'ArrowRight':
          teleportTo(TELEPORT_LOCATIONS[9]); // Este
          break;
        case 'ArrowLeft':
          teleportTo(TELEPORT_LOCATIONS[10]); // Oeste
          break;
        case 'h':
        case 'H':
          showTeleportHelp();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAdminMode, teleportTo]);

  const showTeleportHelp = () => {
    // console.log(`
    // 🚀 SISTEMA DE TELETRANSPORTACIÓN ADMIN
    // =====================================
    // Ctrl + 1: Hotel Exterior
    // Ctrl + 2: Hotel Interior  
    // Ctrl + 3: Policía
    // Ctrl + 4: Hospital
    // Ctrl + 5: Banco
    // Ctrl + 6: Tienda
    // Ctrl + 0: Centro Ciudad
    // Ctrl + ↑: Norte
    // Ctrl + ↓: Sur
    // Ctrl + →: Este
    // Ctrl + ←: Oeste
    // Ctrl + H: Mostrar esta ayuda
    // =====================================
    // `);
  };

  return {
    isAdminMode,
    teleportTo,
    locations: TELEPORT_LOCATIONS,
    showTeleportHelp
  };
}
