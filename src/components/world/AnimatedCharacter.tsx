'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { SkeletonUtils } from 'three-stdlib';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import { AnimationAction } from 'three';

  // Mapeo de animaciones - mapear estados a nombres reales de animaciones
  const getAnimationName = (animationState: string, actions: Record<string, AnimationAction | null>) => {
    const availableActions = Object.keys(actions || {});
    
    console.log(`🔍 Buscando animación para estado: ${animationState}`);
    console.log(`🔍 Acciones disponibles:`, availableActions);
    
    // Mapeo directo para el modelo men-all.glb y women-all.glb
    const animationMap: { [key: string]: string[] } = {
      'idle': ['Idle_11', 'idle', 'Idle', 'IDLE'],
      'walking': ['Walking', 'walking', 'WALKING', 'Walk'],
      'running': ['Running', 'running', 'RUNNING', 'Run'],
      'jump': ['Regular Jump', 'jump', 'Jump', 'JUMP', 'Regular_Jump'],
      'jump_run': ['Jump Run', 'jump_run', 'JumpRun', 'JUMP_RUN', 'jumpRun'],
      'backflip': ['Backflip Jump', 'backflip', 'Backflip', 'BACKFLIP', 'Backflip_Jump']
    };
    
    const possibleNames = animationMap[animationState] || [animationState];
    
    // Buscar la primera animación que exista
    for (const name of possibleNames) {
      if (actions[name]) {
        console.log(`✅ Encontrada animación: ${name}`);
        return name;
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
  // Clonar con SkeletonUtils para preservar rigs/skins y evitar T-pose
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, groupRef);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Cargar modelo y configurar
  useEffect(() => {
    if (clonedScene) {
      clonedScene.traverse((child) => {
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
  }, [clonedScene, modelPath, actions, animations]);

  // Reproducir animación
  useEffect(() => {
    if (modelLoaded && actions) {
      console.log(`🎬 Intentando reproducir: ${animation}`);
      console.log(`🎬 Acciones disponibles:`, Object.keys(actions));
      
      // Obtener el nombre real de la animación
      const targetActionName = getAnimationName(animation, actions);
      
      if (targetActionName && actions[targetActionName]) {
        const targetAction = actions[targetActionName];
        
        console.log(`🎬 Reproduciendo: ${animation} -> ${targetActionName}`);
        
        // Detener todas las animaciones primero
        Object.entries(actions).forEach(([name, action]) => {
          if (action && action.isRunning()) {
            action.stop();
          }
        });
        
        // Iniciar la nueva animación inmediatamente
        targetAction.reset().fadeIn(0.005).play();
      } else {
        console.log(`⚠️ Animación '${animation}' no encontrada, usando idle`);
        const idleActionName = getAnimationName('idle', actions);
        if (idleActionName && actions[idleActionName]) {
          const idleAction = actions[idleActionName];
          
          // Detener todas las animaciones
          Object.entries(actions).forEach(([name, action]) => {
            if (action && action.isRunning()) {
              action.stop();
            }
          });
          
          // Iniciar idle inmediatamente
          idleAction.reset().fadeIn(0.1).play();
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
      {/* Offset Y para bajar el modelo y alinearlo con el cilindro de física */}
      <group position={[0, -1, 0]}>
        <primitive object={clonedScene} />
      </group>
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