'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface TestingCameraState {
  isActive: boolean;
  height: number;
  distance: number;
}

export function useTestingCamera(isChatOpen: boolean = false) {
  const [cameraState, setCameraState] = useState<TestingCameraState>({
    isActive: false,
    height: 50,
    distance: 50
  });

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Si el chat está abierto, no procesar teclas
    if (isChatOpen) return;
    
    // Activar/desactivar cámara de testing con tecla T
    if (event.key && event.key.toLowerCase() === 't') {
      setCameraState(prev => ({
        ...prev,
        isActive: !prev.isActive
      }));
      console.log(`🔍 Cámara de testing ${cameraState.isActive ? 'desactivada' : 'activada'}`);
    }
    
    // Ajustar altura con teclas + y -
    if (event.key === '+' || event.key === '=') {
      setCameraState(prev => ({
        ...prev,
        height: Math.min(prev.height + 10, 200)
      }));
      console.log(`🔍 Altura de cámara: ${cameraState.height + 10}`);
    }
    
    if (event.key === '-') {
      setCameraState(prev => ({
        ...prev,
        height: Math.max(prev.height - 10, 10)
      }));
      console.log(`🔍 Altura de cámara: ${cameraState.height - 10}`);
    }
    
    // Ajustar distancia con teclas [ y ]
    if (event.key === '[') {
      setCameraState(prev => ({
        ...prev,
        distance: Math.max(prev.distance - 10, 10)
      }));
      console.log(`🔍 Distancia de cámara: ${cameraState.distance - 10}`);
    }
    
    if (event.key === ']') {
      setCameraState(prev => ({
        ...prev,
        distance: Math.min(prev.distance + 10, 200)
      }));
      console.log(`🔍 Distancia de cámara: ${cameraState.distance + 10}`);
    }
  }, [isChatOpen, cameraState.isActive, cameraState.height, cameraState.distance]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return {
    isActive: cameraState.isActive,
    height: cameraState.height,
    distance: cameraState.distance,
    toggle: () => setCameraState(prev => ({ ...prev, isActive: !prev.isActive }))
  };
}
