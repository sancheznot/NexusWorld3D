/**
 * Hook para obtener y compartir duraciones de animaciones
 * 
 * Este hook permite que el State Machine use las duraciones reales
 * de las animaciones del modelo 3D en lugar de valores hardcodeados.
 */

import { useEffect } from 'react';
import { AnimationAction } from 'three';

// Store global para duraciones de animación (compartido entre componentes)
export const animationDurations = {
  jump: 1.5,        // Default fallback
  landing: 0.3,     // Default fallback
  dropRunning: 0.8, // Default fallback
  dropRolling: 1.2, // Default fallback
  falling: 1.0,     // Default fallback
};

/**
 * Hook para extraer y almacenar duraciones de animaciones
 * Debe ser llamado desde AnimatedCharacter cuando las animaciones se cargan
 */
export function useAnimationDurations(
  actions: Record<string, AnimationAction | null> | undefined,
  modelLoaded: boolean
) {
  useEffect(() => {
    if (!modelLoaded || !actions) return;

    console.log('🎬 Extrayendo duraciones de animaciones...');

    // Mapeo de estados a nombres de animación
    const animationMap: { [key: string]: string[] } = {
      jump: ['Regular Jump', 'jump', 'Jump', 'JUMP', 'Regular_Jump'],
      landing: ['Landing', 'landing', 'LANDING'],
      dropRunning: ['Drop Running', 'drop_running', 'DropRunning', 'DROP_RUNNING'],
      dropRolling: ['Drop Rolling', 'drop_rolling', 'DropRolling', 'DROP_ROLLING', 'Roll'],
      falling: ['Falling', 'falling', 'FALLING', 'Fall'],
    };

    // Extraer duraciones reales
    Object.entries(animationMap).forEach(([key, possibleNames]) => {
      for (const name of possibleNames) {
        const action = actions[name];
        if (action) {
          const clip = action.getClip();
          const duration = clip.duration;
          (animationDurations as any)[key] = duration;
          console.log(`✅ Duración de ${key}: ${duration.toFixed(2)}s (${name})`);
          break;
        }
      }
    });

    console.log('📊 Duraciones finales:', animationDurations);
  }, [actions, modelLoaded]);
}

/**
 * Obtener duración de una animación específica
 */
export function getAnimationDuration(animationKey: keyof typeof animationDurations): number {
  return animationDurations[animationKey] || 1.0;
}

