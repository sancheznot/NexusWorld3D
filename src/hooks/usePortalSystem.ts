'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Vector3 } from 'three';
import { Portal, MapData, PortalEvent } from '@/types/portal.types';
import { getAllMaps } from '@/lib/game/mapRegistry';

interface UsePortalSystemProps {
  currentMap: string;
  onMapChange: (mapId: string, position: Vector3, rotation: Vector3) => void;
}

export function usePortalSystem({ currentMap, onMapChange }: UsePortalSystemProps) {
  const [activePortal, setActivePortal] = useState<Portal | null>(null);
  const [showPortalUI, setShowPortalUI] = useState(false);

  // Cargar mapas disponibles (memoizado para evitar re-renderizados)
  const maps = useMemo(() => {
    const mapsList = getAllMaps();
    const mapsMap = new Map<string, MapData>();
    mapsList.forEach((m) => mapsMap.set(m.id, m));
    return mapsMap;
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
    console.log(`🚪 Intentando teletransportarse a través del portal:`, portal);
    if (!portal.isActive) {
      console.log(`❌ Portal inactivo:`, portal.id);
      return;
    }

    const targetMap = maps.get(portal.targetMap);
    if (!targetMap) {
      console.error('❌ Target map not found:', portal.targetMap);
      return;
    }
    console.log(`✅ Target map encontrado:`, targetMap);

    // Crear evento de portal
    const portalEvent: PortalEvent = {
      type: 'map_change',
      playerId: 'current-player', // Esto debería venir del contexto del jugador
      portalId: portal.id,
      fromMap: currentMap,
      toMap: portal.targetMap,
      position: portal.targetPosition ?? targetMap.spawnPosition,
      rotation: portal.targetRotation ?? targetMap.spawnRotation
    };

    // Usar la misma lógica simple que funciona en admin teleport
    // Si targetPosition está definido, usarlo directamente
    const nextPos = portal.targetPosition || targetMap.spawnPosition;
    const nextRot = portal.targetRotation || targetMap.spawnRotation;

    console.log(`🚪 Portal: ${portal.id} -> ${portal.targetMap}`);
    console.log(`🎯 Target position:`, nextPos);
    console.log(`🎯 Target rotation:`, nextRot);

    // Llamar onMapChange con las posiciones calculadas
    onMapChange(
      portal.targetMap,
      new Vector3(nextPos.x, nextPos.y, nextPos.z),
      new Vector3(nextRot.x, nextRot.y, nextRot.z)
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

  // Obtener mapas actuales (memoizado)
  const currentMapData = useMemo(() => {
    return maps.get(currentMap);
  }, [currentMap, maps]);

  return {
    activePortal,
    showPortalUI,
    currentMapData,
    handlePlayerEnterPortal,
    handlePlayerExitPortal,
    handleTeleport,
    closePortalUI: () => setShowPortalUI(false)
  };
}
