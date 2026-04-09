'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { SkeletonUtils } from 'three-stdlib';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationAction } from 'three';
import { GAME_CONFIG } from '@/constants/game';
import { useAnimationDurations } from '@/hooks/useAnimationDurations';
import HeldAxe from '@/components/world/HeldAxe';
import { isChopAxeItemId } from '@/constants/choppableTrees';

  // Mapeo de animaciones - mapear estados a nombres reales de animaciones
  const getAnimationName = (animationState: string, actions: Record<string, AnimationAction | null>) => {
    const availableActions = Object.keys(actions || {});
    
    console.log(`🔍 Buscando animación para estado: ${animationState}`);
    console.log(`🔍 Acciones disponibles:`, availableActions);
    
    // Mapeo directo para el modelo men-all.glb y women-all.glb
    const animationMap: { [key: string]: string[] } = {
      'idle': ['Idle_11', 'idle', 'Idle', 'IDLE'],
      'walk': ['Walking', 'walking', 'WALKING', 'Walk'],
      'walking': ['Walking', 'walking', 'WALKING', 'Walk'],
      'run': ['Running', 'running', 'RUNNING', 'Run'],
      'running': ['Running', 'running', 'RUNNING', 'Run'],
      // Animación de caminar hacia atrás no se usara por ahora.
      'walk_backward': ['Walk Backward', 'Walk_Backward', 'walk_backward', 'Walking_Backward', 'WalkBackward'], 
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
  /** ES: itemId de herramienta visible en mano (p. ej. tool_axe). EN: Held tool catalog id. */
  heldToolItemId?: string | null;
}

export default function AnimatedCharacter({
  modelPath,
  position,
  rotation,
  scale,
  isCurrentPlayer,
  username,
  animation,
  heldToolItemId = null,
}: AnimatedCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tiltContainerRef = useRef<THREE.Group>(null);
  // useGLTF de @react-three/drei ya soporta Draco automáticamente
  const { scene, animations } = useGLTF(modelPath);
  // Clonar con SkeletonUtils para preservar rigs/skins y evitar T-pose
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, groupRef);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Extraer duraciones reales de animaciones para el State Machine
  useAnimationDurations(actions, modelLoaded);
  
  // Sistema de inclinación (Sketchbook)
  const lastRotationRef = useRef(rotation[1]); // Guardar última rotación Y
  const angularVelocityRef = useRef(0);
  const velocityRef = useRef(new THREE.Vector3());
  const lastPositionRef = useRef(new THREE.Vector3(...position));

  // Cargar modelo y configurar
  useEffect(() => {
    if (clonedScene) {
      // Marcar todo el grupo como jugador para raycast
      if (groupRef.current) {
        groupRef.current.name = isCurrentPlayer ? 'player' : 'remotePlayer';
        groupRef.current.userData.isPlayer = true;
        groupRef.current.userData.isRemotePlayer = !isCurrentPlayer;
      }
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.isCollider = true;
          child.userData.collisionType = 'player';
          child.userData.isPlayer = true;
          child.userData.isRemotePlayer = !isCurrentPlayer;
          // Marcar con nombre específico para raycast
          child.name = isCurrentPlayer ? 'player-mesh' : 'remotePlayer-mesh';
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

  // Sistema de inclinación (Movement Tilt)
  useFrame((_, delta) => {
    if (!isCurrentPlayer || !tiltContainerRef.current) return;
    
    // Calcular velocidad del personaje
    const currentPosition = new THREE.Vector3(...position);
    velocityRef.current.copy(currentPosition).sub(lastPositionRef.current).divideScalar(delta);
    lastPositionRef.current.copy(currentPosition);
    
    // Calcular velocidad angular (cambio de rotación por segundo)
    const currentRotation = rotation[1];
    let rotationDelta = currentRotation - lastRotationRef.current;
    
    // Normalizar el delta de rotación para manejar el wrap-around de -π a π
    if (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2;
    if (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2;
    
    angularVelocityRef.current = rotationDelta / delta;
    lastRotationRef.current = currentRotation;
    
    // Aplicar inclinación lateral basada en velocidad angular y velocidad lineal
    // Fórmula: rotation.z = -angularVelocity * multiplier * velocity.length()
    const velocityLength = velocityRef.current.length();
    
    // Escalar la inclinación basado en la velocidad (más velocidad = más inclinación permitida)
    // Velocidad de caminar ~4 unidades/s, correr ~8 unidades/s
    // Usar curva cúbica para reducir drásticamente la inclinación a velocidades bajas
    const velocityNormalized = Math.min(velocityLength / 7, 1.0); 
    const velocityFactor = Math.pow(velocityNormalized, 3); // Curva cúbica: casi 0 inclinación al caminar
    const adjustedMultiplier = GAME_CONFIG.player.tilt.multiplier * velocityFactor;
    
    const tiltAmount = -angularVelocityRef.current * adjustedMultiplier * velocityLength;
    
    // Limitar la inclinación máxima para evitar que se vea exagerado
    const maxTilt = 0.25; // ~14 grados máximo
    const clampedTilt = THREE.MathUtils.clamp(tiltAmount, -maxTilt, maxTilt);
    
    // Aplicar inclinación con suavizado
    tiltContainerRef.current.rotation.z = THREE.MathUtils.lerp(
      tiltContainerRef.current.rotation.z,
      clampedTilt,
      0.15 // Factor de suavizado (más alto = más rápido)
    );
    
    // Compensación vertical para evitar que el personaje flote cuando se inclina
    // Fórmula: position.y = (cos(abs(tilt)) / 2) - 0.5
    const verticalCompensation = 
      (Math.cos(Math.abs(clampedTilt)) / 2) * GAME_CONFIG.player.tilt.verticalCompensation + 
      GAME_CONFIG.player.tilt.verticalOffset;
    
    tiltContainerRef.current.position.y = THREE.MathUtils.lerp(
      tiltContainerRef.current.position.y,
      verticalCompensation,
      0.15 // Factor de suavizado
    );
  });

  if (!modelLoaded) {
    return (
      <Html center>
        <div className="text-white text-lg">Cargando personaje...</div>
      </Html>
    );
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Contenedor de inclinación (tiltContainer) - centrado para inclinación fácil */}
      <group ref={tiltContainerRef}>
        {/* Offset Y para bajar el modelo y alinearlo con el cilindro de física */}
        <group position={[0, -1, 0]}>
          <primitive object={clonedScene} />
          <HeldAxe
            skinnedRoot={clonedScene}
            visible={
              heldToolItemId != null && isChopAxeItemId(heldToolItemId)
            }
          />
        </group>
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