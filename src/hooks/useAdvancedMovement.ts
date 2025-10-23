'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useMouseCamera } from './useMouseCamera';
import * as THREE from 'three';

interface MovementInput {
  x: number;
  z: number;
  rotation: number;
  isRunning: boolean;
  isJumping: boolean;
  jumpType: 'normal' | 'running' | 'backflip' | null;
}

export function useAdvancedMovement(enabled: boolean = true) {
  const { setMoving, setRunning, rotation: playerRotation } = usePlayerStore();
  const { isChatOpen } = useUIStore();
  const keysRef = useRef<Set<string>>(new Set());
  const { getCameraState, setCameraState } = useMouseCamera(enabled);
  const playerRotationRef = useRef(playerRotation.y);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    // console.log(`🎮 Tecla presionada: ${key}, enabled: ${enabled}, chatOpen: ${isChatOpen}`);
    if (!enabled || isChatOpen) return;
    keysRef.current.add(key);
    // console.log(`🎮 Tecla agregada al set: ${key}, total keys: ${keysRef.current.size}`);
  }, [enabled, isChatOpen]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled || isChatOpen) return;
    keysRef.current.delete(event.key.toLowerCase());
  }, [enabled, isChatOpen]);

  const calculateMovementInput = useCallback((): MovementInput => {
    const keys = keysRef.current;

    if (!enabled || isChatOpen) {
      setMoving(false);
      setRunning(false);
      return { x: 0, z: 0, rotation: playerRotationRef.current, isRunning: false, isJumping: false, jumpType: null };
    }

    // NUEVO SISTEMA DE CONTROLES TIPO "TANK":
    // A/D rotan al personaje
    // W/S mueven adelante/atrás en la dirección del personaje
    
    const rotationSpeed = 0.05; // Velocidad de rotación
    let currentRotation = playerRotationRef.current;

    // 1) Rotar con A/D (invertido para que coincida con la cámara)
    if (keys.has('a')) {
      currentRotation += rotationSpeed;  // A rota a la izquierda (positivo)
    }
    if (keys.has('d')) {
      currentRotation -= rotationSpeed;  // D rota a la derecha (negativo)
    }

    // Actualizar la rotación del personaje
    playerRotationRef.current = currentRotation;

    // 2) Movimiento adelante/atrás con W/S
    let forwardMovement = 0;
    if (keys.has('w')) forwardMovement = 1;
    if (keys.has('s')) forwardMovement = -1;

    // 3) Calcular vector de movimiento basado en la rotación del personaje
    const move = new THREE.Vector3();
    if (forwardMovement !== 0) {
      // El personaje se mueve en la dirección que está mirando
      move.x = Math.sin(currentRotation) * forwardMovement;
      move.z = Math.cos(currentRotation) * forwardMovement;
    }

    // 4) Actualizar la cámara para que siga al personaje
    const cameraState = getCameraState();
    const cameraOffset = cameraState.horizontal - currentRotation;
    
    // Mantener la cámara detrás del personaje con un offset suave
    if (Math.abs(cameraOffset) > 0.1) {
      setCameraState({ horizontal: currentRotation });
    }

    // 5) Correr / saltar
    const isRunning = keys.has('shift');
    let isJumping = false;
    let jumpType: MovementInput['jumpType'] = null;
    if (keys.has(' ')) {
      isJumping = true;
      if (keys.has('shift') && keys.has('s')) jumpType = 'backflip';
      else if (keys.has('shift'))              jumpType = 'running';
      else                                     jumpType = 'normal';
    }

    // 6) Actualizar estados
    const isMovingNow = forwardMovement !== 0;
    setMoving(isMovingNow);
    setRunning(isRunning);

    // Debug (comentado para no llenar la consola)
    // if (isMovingNow || isJumping || keys.has('a') || keys.has('d')) {
    //   console.log(`🎮 Tank Controls: forward=${forwardMovement}, rotation=${currentRotation.toFixed(2)}, move=(${move.x.toFixed(2)}, ${move.z.toFixed(2)})`);
    // }

    return {
      x: move.x,
      z: move.z,
      rotation: currentRotation,
      isRunning,
      isJumping,
      jumpType
    };
  }, [enabled, isChatOpen, setMoving, setRunning, getCameraState, setCameraState]);

  // Sincronizar la rotación del personaje desde el store
  useEffect(() => {
    playerRotationRef.current = playerRotation.y;
  }, [playerRotation.y]);

  useEffect(() => {
    console.log(`🎮 Configurando event listeners, enabled: ${enabled}`);
    
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      console.log('🎮 Event listeners agregados');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      console.log('🎮 Event listeners removidos');
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  return { calculateMovementInput, getCameraState };
}