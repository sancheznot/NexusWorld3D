'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

export type AnimationState = 'idle' | 'walking' | 'running' | 'jump' | 'jump_run' | 'backflip';

export function useCharacterAnimation(jumpType?: 'normal' | 'running' | 'backflip' | null) {
  const { isMoving, isRunning } = usePlayerStore();
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState>('idle');

  useEffect(() => {
    // console.log(`🎬 Animation state: isMoving=${isMoving}, isRunning=${isRunning}, jumpType=${jumpType}`);
    let newAnimation: AnimationState = 'idle';
    
    // Prioridad: Saltos > Corriendo > Caminando > Idle
    if (jumpType === 'backflip') {
      newAnimation = 'backflip';
    } else if (jumpType === 'running') {
      newAnimation = 'jump_run';
    } else if (jumpType === 'normal') {
      newAnimation = 'jump';
    } else if (isRunning && isMoving) {
      newAnimation = 'running';
    } else if (isMoving) {
      newAnimation = 'walking';
    } else {
      newAnimation = 'idle';
    }
    
    // Solo cambiar si es diferente para evitar loops
    if (newAnimation !== currentAnimation) {
      // console.log(`🎬 Cambiando animación de '${currentAnimation}' a '${newAnimation}'`);
      setCurrentAnimation(newAnimation);
    }
  }, [isMoving, isRunning, jumpType, currentAnimation]); // Added currentAnimation to dependencies

  return currentAnimation;
}