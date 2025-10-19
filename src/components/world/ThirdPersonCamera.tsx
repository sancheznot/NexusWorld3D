'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useAdvancedMovement } from '@/hooks/useAdvancedMovement';
import * as THREE from 'three';

interface ThirdPersonCameraProps {
  target?: THREE.Object3D;
}

export default function ThirdPersonCamera({ target }: ThirdPersonCameraProps) {
  const { camera } = useThree();
  const { position } = usePlayerStore();
  const { getCameraState } = useAdvancedMovement(true); // Always enabled for camera
  
  // Configuración de la cámara - más cerca del personaje
  const cameraDistance = 6; // Distancia base
  const cameraHeight = 2; // Altura base
  const smoothness = 0.15; // Más suave
  const minHeight = 1; // Altura mínima para evitar atravesar el suelo
  const minDistance = 2; // Distancia mínima para evitar atravesar al personaje
  
  // Estado de la cámara
  const targetPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 1000;
    (camera as THREE.PerspectiveCamera).fov = 75;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
    
    // Obtener ángulo de la cámara del hook de movimiento
    const { horizontal, vertical } = getCameraState();
    
    // Calcular posición de la cámara basada en el ángulo
    const horizontalDistance = cameraDistance * Math.cos(vertical);
    const verticalOffset = cameraHeight + cameraDistance * Math.sin(vertical);
    
    // Aplicar distancia mínima para evitar atravesar al personaje
    const finalDistance = Math.max(horizontalDistance, minDistance);
    
    // Calcular posición objetivo
    const targetX = playerPosition.x + finalDistance * Math.sin(horizontal);
    const targetY = playerPosition.y + verticalOffset;
    const targetZ = playerPosition.z + finalDistance * Math.cos(horizontal);
    
    // Aplicar colisión con el suelo - evitar que la cámara atraviese el suelo
    const finalY = Math.max(targetY, playerPosition.y + minHeight);
    
    targetPosition.current.set(targetX, finalY, targetZ);

    // Suavizar movimiento de la cámara
    currentPosition.current.lerp(targetPosition.current, smoothness);
    camera.position.copy(currentPosition.current);
    
    // Hacer que la cámara mire al jugador
    camera.lookAt(playerPosition);
  });

  return null; // Este componente no renderiza nada visual
}
