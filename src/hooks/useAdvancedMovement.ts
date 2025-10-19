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

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    console.log(`🎮 Tecla presionada: ${key}, enabled: ${enabled}`);
    if (!enabled) return;
    keysRef.current.add(key);
    console.log(`🎮 Tecla agregada al set: ${key}, total keys: ${keysRef.current.size}`);
  }, [enabled]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    keysRef.current.delete(event.key.toLowerCase());
  }, [enabled]);

  const calculateMovementInput = useCallback((): MovementInput => {
    const keys = keysRef.current;

    if (!enabled) {
      setMoving(false);
      setRunning(false);
      const cameraState = getCameraState();
      return { x: 0, z: 0, rotation: cameraState.horizontal, isRunning: false, isJumping: false, jumpType: null };
    }

    // 1) Leer teclas como "intenciones" (adelante/atrás y strafe)
    let fb = 0;      // forward/back
    let strafe = 0;  // left/right
    if (keys.has('w')) fb += 1;
    if (keys.has('s')) fb -= 1;
    if (keys.has('a')) strafe -= 1;
    if (keys.has('d')) strafe += 1;

    const cameraState = getCameraState();
    const yaw = cameraState.horizontal;

    // 2) Construir forward/right relativos a la cámara (plano XZ)
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));            // hacia donde mira la cámara
    const right   = new THREE.Vector3(Math.sin(yaw + Math.PI/2), 0, Math.cos(yaw + Math.PI/2));

    // 3) Vector de movimiento en mundo (sin mutar los vectores originales)
    const move = new THREE.Vector3();
    move.addScaledVector(forward, fb);
    move.addScaledVector(right, strafe);

    // 4) Normalizar si hace falta
    if (move.lengthSq() > 1e-6) move.normalize();

    // 5) Rotación del jugador hacia su vector de movimiento (si hay)
    let rotation = yaw; // por defecto, mirando hacia donde mira la cámara
    if (move.lengthSq() > 1e-6) {
      rotation = Math.atan2(move.x, move.z); // ojo: atan2(x,z) en XZ
    }

    // 6) Correr / saltar
    const isRunning = keys.has('shift');
    let isJumping = false;
    let jumpType: MovementInput['jumpType'] = null;
    if (keys.has(' ')) {
      isJumping = true;
      if (keys.has('shift') && keys.has('s')) jumpType = 'backflip';
      else if (keys.has('shift'))              jumpType = 'running';
      else                                     jumpType = 'normal';
    }

    // 7) Devolver X/Z EN MUNDO (no en cámara): cannon los usa directo
    const isMovingNow = move.lengthSq() > 1e-6;
    setMoving(isMovingNow);
    setRunning(isRunning);

    // Debug
    if (isMovingNow || isJumping) {
      console.log(`🎮 Movement: fb=${fb}, strafe=${strafe}, move=(${move.x.toFixed(2)}, ${move.z.toFixed(2)}), yaw=${yaw.toFixed(2)}, rotation=${rotation.toFixed(2)}`);
    }

    return {
      x: move.x,
      z: move.z,
      rotation,
      isRunning,
      isJumping,
      jumpType
    };
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