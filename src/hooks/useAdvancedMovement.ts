'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import * as THREE from 'three';

interface MovementInput {
  x: number;
  z: number;
  rotation: number;
  isRunning: boolean;
}

export function useAdvancedMovement(enabled: boolean = true) {
  const { setMoving, setRunning } = usePlayerStore();
  const keysRef = useRef<Set<string>>(new Set());
  const cameraAngle = useRef({ horizontal: 0, vertical: 0 });
  
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

    if (!enabled) {
      setMoving(false);
      setRunning(false);
      return { x: 0, z: 0, rotation: cameraAngle.current.horizontal, isRunning: false };
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

    const rotation = cameraAngle.current.horizontal;

    const isMoving = inputVector.length() > 0;
    setMoving(isMoving);
    setRunning(isRunning);

    // Debug: mostrar input cuando hay movimiento
    if (isMoving) {
      console.log(`🎮 Input calculado: x=${inputVector.x.toFixed(2)}, z=${inputVector.y.toFixed(2)}, running=${isRunning}`);
    }

    return { x: inputVector.x, z: inputVector.y, rotation, isRunning };
  }, [enabled, setMoving, setRunning]);

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

  const getCameraAngle = useCallback(() => cameraAngle.current, []);

  return { calculateMovementInput, getCameraAngle };
}