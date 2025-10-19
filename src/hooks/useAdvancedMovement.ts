'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
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
  const { setMoving, setRunning } = usePlayerStore();
  const keysRef = useRef<Set<string>>(new Set());
  const { getCameraState } = useMouseCamera(enabled);
  
  console.log(`🎮 useAdvancedMovement enabled: ${enabled}`);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    console.log(`🎮 Tecla presionada: ${event.key}`);
    keysRef.current.add(event.key.toLowerCase());
  }, [enabled]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    keysRef.current.delete(event.key.toLowerCase());
  }, [enabled]);

  const calculateMovementInput = useCallback((): MovementInput => {
    const keys = keysRef.current;
    let x = 0;
    let z = 0;
    let isRunning = false;
    let isJumping = false;
    let jumpType: 'normal' | 'running' | 'backflip' | null = null;

    if (!enabled) {
      setMoving(false);
      setRunning(false);
      const cameraState = getCameraState();
      return { x: 0, z: 0, rotation: cameraState.horizontal, isRunning: false, isJumping: false, jumpType: null };
    }

    // Detectar saltos
    if (keys.has(' ')) { // Espacio presionado
      isJumping = true;
      
      if (keys.has('shift') && keys.has('s')) {
        // Backflip: Espacio + Shift + S
        jumpType = 'backflip';
        console.log('🎮 Salto: BACKFLIP');
      } else if (keys.has('shift')) {
        // Salto corriendo: Shift + Espacio
        jumpType = 'running';
        console.log('🎮 Salto: CORRIENDO');
      } else {
        // Salto normal: Solo Espacio
        jumpType = 'normal';
        console.log('🎮 Salto: NORMAL');
      }
    }

    if (keys.has('shift')) {
      isRunning = true;
    }

    if (keys.has('w')) z -= 1;
    if (keys.has('s')) z += 1;
    if (keys.has('a')) x -= 1;
    if (keys.has('d')) x += 1;

    const inputVector = new THREE.Vector2(x, z);
    if (inputVector.length() > 1) {
      inputVector.normalize();
    }

    // Calcular rotación basada en la dirección de movimiento relativa a la cámara
    let rotation = 0;
    const cameraState = getCameraState();
    
    if (inputVector.length() > 0) {
      // Calcular el ángulo de la dirección de movimiento relativa a la cámara
      rotation = Math.atan2(inputVector.x, inputVector.y) + cameraState.horizontal;
    } else {
      // Si no hay movimiento, mantener la rotación actual
      rotation = cameraState.horizontal;
    }

    const isMoving = inputVector.length() > 0;
    setMoving(isMoving);
    setRunning(isRunning);

    // Debug: mostrar input cuando hay movimiento o salto
    if (isMoving || isJumping) {
      console.log(`🎮 Input calculado: x=${inputVector.x.toFixed(2)}, z=${inputVector.y.toFixed(2)}, running=${isRunning}, jumping=${isJumping}, jumpType=${jumpType}`);
    }

    return { x: inputVector.x, z: inputVector.y, rotation, isRunning, isJumping, jumpType };
  }, [enabled, setMoving, setRunning, getCameraState]);

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