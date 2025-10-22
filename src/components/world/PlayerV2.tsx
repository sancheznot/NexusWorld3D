'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useAdvancedMovement } from '@/hooks/useAdvancedMovement';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { collisionSystem } from '@/lib/three/collisionSystem';
import AnimatedCharacter from '@/components/world/AnimatedCharacter';
import { useCharacterAnimation } from '@/hooks/useCharacterAnimation';
import { PHYSICS_CONFIG } from '@/constants/physics';
import * as THREE from 'three';
import { PlayerCustomization } from '@/types/player.types';

interface PlayerProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isCurrentPlayer?: boolean;
  keyboardEnabled?: boolean;
  customization?: PlayerCustomization;
  username?: string;
  remoteAnimation?: string; // animación enviada desde servidor para jugadores remotos
}

export default function PlayerV2({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  isCurrentPlayer = false,
  keyboardEnabled = true,
  customization,
  username,
  remoteAnimation,
}: PlayerProps) {
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
  // Solo el jugador local debe tener physics body
  const physicsRef = useCannonPhysics(isCurrentPlayer);
  const [input, setInput] = useState({ x: 0, z: 0, rotation: 0, isRunning: false, isJumping: false, jumpType: null as 'normal' | 'running' | 'backflip' | null });
  const [isTabVisible, setIsTabVisible] = useState(true);
  const currentAnimation = useCharacterAnimation(input.jumpType);

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

  // Detectar cambios de visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
      console.log(`👁️ Tab visibility: ${!document.hidden}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useFrame((state, delta) => {
    // Solo el jugador local debe ejecutar useFrame
    if (!isCurrentPlayer) return;
    
    if (!physicsRef || !physicsRef.current) {
      console.log('⚠️ PlayerV2 useFrame: physicsRef.current is null');
      return;
    }
    
    if (!isTabVisible) {
      console.log('⚠️ PlayerV2 useFrame: tab not visible');
      return;
    }
    
    // Calcular input en useFrame, no durante el renderizado
    const currentInput = calculateMovementInput();
    setInput(currentInput);
    
    // Limitar delta con timestep fijo de física
    const clampedDelta = Math.min(delta, PHYSICS_CONFIG.MAX_DELTA_TIME);
    
    // Aplicar movimiento ANTES de actualizar la física
    if (physicsRef.current) {
      physicsRef.current.updateMovement({
        x: currentInput.x,
        z: currentInput.z,
        isRunning: currentInput.isRunning
      }, clampedDelta);
    }
    
    // Actualizar física de Cannon.js (esto mueve el cuerpo con la velocidad aplicada)
    if (physicsRef.current) {
      physicsRef.current.update(clampedDelta);
    }
    
    // Manejar saltos
    if (currentInput.isJumping && physicsRef.current.isGrounded()) {
      let jumpForce = 4;
      if (currentInput.jumpType === 'running') jumpForce = 5;
      else if (currentInput.jumpType === 'backflip') jumpForce = 6;
      
      physicsRef.current.jump(jumpForce);
    }
    
    // Obtener posición de Cannon.js y sincronizar con el store
    const cannonPosition = physicsRef.current.getPlayerPosition();
    
    // Actualizar store (para HUD y networking) y que AnimatedCharacter reciba por props
    updatePosition({ x: cannonPosition.x, y: cannonPosition.y, z: cannonPosition.z });

    // Actualizar estados de animación
    const isMoving = currentInput.x !== 0 || currentInput.z !== 0;
    setMoving(isMoving);
    setRunning(currentInput.isRunning);

    // Rotar personaje siempre hacia la dirección de movimiento o cámara
    const targetRotation = currentInput.rotation;
    updateRotation({ x: 0, y: targetRotation, z: 0 });

    const currentPosition = new THREE.Vector3(cannonPosition.x, cannonPosition.y, cannonPosition.z);
    const distance = currentPosition.distanceTo(lastPositionRef.current);
    
    // Debug (comentado para no llenar la consola)
    // if (distance > 0.1 || currentInput.isJumping || Math.abs(cannonVelocity.y) > 0.1) {
    //   console.log(`🎮 Cannon Physics: pos=${cannonPosition.x.toFixed(2)}, ${cannonPosition.y.toFixed(2)}, ${cannonPosition.z.toFixed(2)}, vel=${cannonVelocity.x.toFixed(2)}, ${cannonVelocity.y.toFixed(2)}, ${cannonVelocity.z.toFixed(2)}, jump=${currentInput.isJumping}, jumpType=${currentInput.jumpType}, isGrounded=${physicsRef.current.isGrounded()}`);
    //   lastPositionRef.current.copy(currentPosition);
    // }
    if (distance > 0.1) {
      lastPositionRef.current.copy(currentPosition);
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
      animation={isCurrentPlayer ? currentAnimation : (remoteAnimation || 'idle')}
    />
  );
}