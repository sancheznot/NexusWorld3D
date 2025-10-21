'use client';

import { useState, useCallback, useEffect } from 'react';
import { Vector3 } from 'three';
import { Portal, MapData, PortalEvent } from '@/types/portal.types';

interface UsePortalSystemProps {
  currentMap: string;
  playerPosition: Vector3;
  onMapChange: (mapId: string, position: Vector3, rotation: Vector3) => void;
}

export function usePortalSystem({ currentMap, playerPosition, onMapChange }: UsePortalSystemProps) {
  const [activePortal, setActivePortal] = useState<Portal | null>(null);
  const [showPortalUI, setShowPortalUI] = useState(false);
  const [maps, setMaps] = useState<Map<string, MapData>>(new Map());

  // Cargar mapas disponibles
  useEffect(() => {
    const loadMaps = async () => {
      try {
        // Por ahora, definimos mapas estáticos
        const mapsData: MapData[] = [
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
            objects: []
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
            objects: []
          }
        ];

        const mapsMap = new Map();
        mapsData.forEach(map => mapsMap.set(map.id, map));
        setMaps(mapsMap);
      } catch (error) {
        console.error('Error loading maps:', error);
      }
    };

    loadMaps();
  }, []);

  // Manejar entrada a portal
  const handlePlayerEnterPortal = useCallback((portal: Portal) => {
    setActivePortal(portal);
    setShowPortalUI(true);
  }, []);

  // Manejar salida de portal
  const handlePlayerExitPortal = useCallback(() => {
    setActivePortal(null);
    setShowPortalUI(false);
  }, []);

  // Manejar teletransportación
  const handleTeleport = useCallback((portal: Portal) => {
    if (!portal.isActive) return;

    const targetMap = maps.get(portal.targetMap);
    if (!targetMap) {
      console.error('Target map not found:', portal.targetMap);
      return;
    }

    // Crear evento de portal
    const portalEvent: PortalEvent = {
      type: 'map_change',
      playerId: 'current-player', // Esto debería venir del contexto del jugador
      portalId: portal.id,
      fromMap: currentMap,
      toMap: portal.targetMap,
      position: portal.targetPosition,
      rotation: portal.targetRotation
    };

    // Notificar cambio de mapa
    onMapChange(
      portal.targetMap,
      new Vector3(portal.targetPosition.x, portal.targetPosition.y, portal.targetPosition.z),
      new Vector3(portal.targetRotation.x, portal.targetRotation.y, portal.targetRotation.z)
    );

    // Cerrar UI
    setShowPortalUI(false);
    setActivePortal(null);

    console.log('Portal event:', portalEvent);
  }, [currentMap, maps, onMapChange]);

  // Manejar teclas
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'e' || event.key === 'E') {
        if (activePortal && showPortalUI) {
          handleTeleport(activePortal);
        }
      }
      if (event.key === 'Escape') {
        setShowPortalUI(false);
        setActivePortal(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activePortal, showPortalUI, handleTeleport]);

  // Obtener mapas actuales
  const getCurrentMap = useCallback(() => {
    return maps.get(currentMap);
  }, [currentMap, maps]);

  return {
    activePortal,
    showPortalUI,
    currentMapData: getCurrentMap(),
    handlePlayerEnterPortal,
    handlePlayerExitPortal,
    handleTeleport,
    closePortalUI: () => setShowPortalUI(false)
  };
}
