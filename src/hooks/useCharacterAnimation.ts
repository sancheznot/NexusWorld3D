'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

export type AnimationState = 'idle' | 'walking' | 'running';

export function useCharacterAnimation() {
  const { isMoving, isRunning } = usePlayerStore();
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState>('idle');

  useEffect(() => {
    console.log(`🎬 Animation state: isMoving=${isMoving}, isRunning=${isRunning}`);
    let newAnimation: AnimationState = 'idle';
    
    if (isRunning && isMoving) {
      newAnimation = 'running';
    } else if (isMoving) {
      newAnimation = 'walking';
    } else {
      newAnimation = 'idle';
    }
    
    console.log(`🎬 Cambiando animación de '${currentAnimation}' a '${newAnimation}'`);
    setCurrentAnimation(newAnimation);
  }, [isMoving, isRunning, currentAnimation]);

  return currentAnimation;
}