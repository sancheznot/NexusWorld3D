'use client';

import { useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import { AnimationAction } from 'three';

// Mapeo de animaciones - mapear estados a nombres reales de animaciones
const getAnimationName = (animationState: string, actions: Record<string, AnimationAction | null>) => {
  const availableActions = Object.keys(actions || {});
  
  console.log(`🔍 Buscando animación para estado: ${animationState}`);
  console.log(`🔍 Acciones disponibles:`, availableActions);
  
  // Buscar patrones específicos en los nombres de animaciones
  for (const actionName of availableActions) {
    const lowerActionName = actionName.toLowerCase();
    const lowerAnimationState = animationState.toLowerCase();
    
    // Mapear estados a patrones de nombres (tanto para man como woman)
    if (lowerAnimationState === 'idle' && (lowerActionName.includes('idle_man') || lowerActionName.includes('idle_woman'))) {
      console.log(`✅ Encontrada animación idle: ${actionName}`);
      return actionName;
    }
    if (lowerAnimationState === 'walking' && (lowerActionName.includes('walking_man') || lowerActionName.includes('walking_woman'))) {
      console.log(`✅ Encontrada animación walking: ${actionName}`);
      return actionName;
    }
    if (lowerAnimationState === 'running' && (lowerActionName.includes('running_man') || lowerActionName.includes('running_woman'))) {
      console.log(`✅ Encontrada animación running: ${actionName}`);
      return actionName;
    }
  }
  
  console.log(`⚠️ No se encontró animación para '${animationState}', usando primera disponible`);
  // Si no se encuentra, usar la primera animación disponible
  return availableActions[0] || null;
};

interface AnimatedCharacterProps {
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  isCurrentPlayer: boolean;
  username?: string;
  animation: string;
}

export default function AnimatedCharacter({
  modelPath,
  position,
  rotation,
  scale,
  isCurrentPlayer,
  username,
  animation,
}: AnimatedCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  // useGLTF de @react-three/drei ya soporta Draco automáticamente
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, groupRef);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Cargar modelo y configurar
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.isCollider = true;
          child.userData.collisionType = 'player';
        }
      });
      setModelLoaded(true);
      console.log(`🎭 Modelo cargado: ${modelPath}`);
      console.log(`🎬 Animaciones disponibles:`, Object.keys(actions || {}));
      
      // Debug: verificar si hay animaciones
      if (animations && animations.length > 0) {
        console.log(`🎬 Animaciones encontradas:`, animations.map(anim => anim.name));
      } else {
        console.log(`⚠️ No se encontraron animaciones en el modelo`);
      }
      
      // Reproducir animación idle inmediatamente
      const idleActionName = getAnimationName('idle', actions);
      if (idleActionName && actions && actions[idleActionName]) {
        console.log(`🎬 Iniciando animación idle: ${idleActionName}`);
        actions[idleActionName].reset().fadeIn(0.2).play();
      } else if (actions && Object.keys(actions).length > 0) {
        // Si no hay 'idle', usar la primera animación disponible
        const firstAction = Object.values(actions)[0];
        if (firstAction) {
          console.log(`🎬 Usando primera animación disponible: ${Object.keys(actions)[0]}`);
          firstAction.reset().fadeIn(0.2).play();
        }
      }
    }
  }, [scene, modelPath, actions, animations]);

  // Reproducir animación
  useEffect(() => {
    if (modelLoaded && actions) {
      console.log(`🎬 Intentando reproducir: ${animation}`);
      console.log(`🎬 Acciones disponibles:`, Object.keys(actions));
      
      // Detener todas las animaciones primero
      Object.values(actions).forEach(action => {
        if (action && action.isRunning()) {
          action.fadeOut(0.2);
          action.stop();
        }
      });
      
      // Obtener el nombre real de la animación
      const targetActionName = getAnimationName(animation, actions);
      
      if (targetActionName && actions[targetActionName]) {
        console.log(`🎬 Reproduciendo: ${animation} -> ${targetActionName}`);
        actions[targetActionName].reset().fadeIn(0.2).play();
      } else {
        console.log(`⚠️ Animación '${animation}' no encontrada, usando idle`);
        const idleActionName = getAnimationName('idle', actions);
        if (idleActionName && actions[idleActionName]) {
          actions[idleActionName].reset().fadeIn(0.2).play();
        } else if (Object.keys(actions).length > 0) {
          // Usar la primera animación disponible
          const firstAction = Object.values(actions)[0];
          if (firstAction) {
            console.log(`🎬 Usando primera animación disponible: ${Object.keys(actions)[0]}`);
            firstAction.reset().fadeIn(0.2).play();
          }
        }
      }
    }
  }, [modelLoaded, actions, animation]);

  if (!modelLoaded) {
    return (
      <Html center>
        <div className="text-white text-lg">Cargando personaje...</div>
      </Html>
    );
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
      {!isCurrentPlayer && username && (
        <Html position={[0, 2.5, 0]}>
          <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-md">
            {username}
          </div>
        </Html>
      )}
    </group>
  );
}

// useGLTF de @react-three/drei soporta Draco compression automáticamente
// Para comprimir modelos: gltf-pipeline -i input.glb -o output.glb -d
// O usar el script: ./compress-characters.sh