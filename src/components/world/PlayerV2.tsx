'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { usePlayerStore } from '@/store/playerStore';
import { useAdvancedMovement } from '@/hooks/useAdvancedMovement';
import { PlayerPhysics } from '@/lib/three/physics';
import { collisionSystem } from '@/lib/three/collisionSystem';
import AnimatedCharacter from '@/components/world/AnimatedCharacter';
import { useCharacterAnimation } from '@/hooks/useCharacterAnimation';
import * as THREE from 'three';
import { PlayerCustomization } from '@/types/player.types';

interface PlayerProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isCurrentPlayer?: boolean;
  keyboardEnabled?: boolean;
  customization?: PlayerCustomization;
  username?: string;
}

export default function PlayerV2({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  isCurrentPlayer = false,
  keyboardEnabled = true,
  customization,
  username,
}: PlayerProps) {
  const physicsRef = useRef<PlayerPhysics>(new PlayerPhysics());
  const lastPositionRef = useRef(new THREE.Vector3(...position));
  const { scene } = useThree();
  
  const { 
    position: playerPosition, 
    rotation: playerRotation,
    updatePosition,
    updateRotation,
    setMoving,
    setRunning
  } = usePlayerStore();

  const { calculateMovementInput } = useAdvancedMovement(isCurrentPlayer && keyboardEnabled);
  const currentAnimation = useCharacterAnimation();

  const defaultCustomization: PlayerCustomization = {
    bodyColor: '#007bff',
    headColor: '#ffdbac',
    eyeColor: '#000000',
    bodyType: 'normal',
    headType: 'normal',
    height: 1.0,
    modelType: 'men',
    customBaseModel: 'men',
  };

  const custom = customization || defaultCustomization;

  useEffect(() => {
    if (isCurrentPlayer) {
      collisionSystem.registerSceneColliders(scene);
      console.log('🔧 Sistema de colisiones inicializado');
      // NO precargar animaciones - se cargarán bajo demanda
    }
  }, [isCurrentPlayer, scene, custom.modelType]);

  useFrame((state, delta) => {
    if (isCurrentPlayer) {
      const input = calculateMovementInput();
      
      if (input.x !== 0 || input.z !== 0) {
        console.log(`🎮 Movimiento detectado:`, input);
      }
      
      // Calcular nueva posición basada en input
      const currentPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
      const isOnGround = currentPos.y <= 1.5;
      const velocity = physicsRef.current.update(delta, input, isOnGround);
      
      // Aplicar movimiento
      currentPos.x += velocity.x * delta;
      currentPos.z += velocity.z * delta;
      currentPos.y += velocity.y * delta;
      
      // Aplicar colisiones (solo suelo)
      const correctedPosition = collisionSystem.checkCollision(currentPos);
      
      // Actualizar store con nueva posición
      updatePosition({
        x: correctedPosition.x,
        y: correctedPosition.y,
        z: correctedPosition.z,
      });

      // Actualizar estados de animación
      const isMoving = input.x !== 0 || input.z !== 0;
      setMoving(isMoving);
      setRunning(input.isRunning);

      // Rotar personaje hacia la dirección de movimiento
      if (isMoving) {
        const targetRotation = input.rotation;
        updateRotation({ x: 0, y: targetRotation, z: 0 });
      }

      const distance = correctedPosition.distanceTo(lastPositionRef.current);
      
      if (distance > 0.1) {
        lastPositionRef.current.copy(correctedPosition);
      }
    }
  });

  const getModelPath = () => {
    const gender = custom.modelType === 'woman' ? 'women' : 'men';
    // Usar modelo unificado con todas las animaciones
    return `/models/characters/${gender}/${gender}-all.glb`;
  };

  return (
    <AnimatedCharacter
      modelPath={getModelPath()}
      position={isCurrentPlayer ? [playerPosition.x, playerPosition.y, playerPosition.z] : position}
      rotation={isCurrentPlayer ? [playerRotation.x, playerRotation.y, playerRotation.z] : rotation}
      scale={[1, 1, 1]}
      isCurrentPlayer={isCurrentPlayer}
      username={username || ''}
      animation={currentAnimation}
    />
  );
}