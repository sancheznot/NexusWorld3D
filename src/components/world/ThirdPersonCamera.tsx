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
  const { getCameraAngle } = useAdvancedMovement(true); // Always enabled for camera
  
  // Configuración de la cámara - más cerca del personaje
  const cameraDistance = 4; // Reducido de 8 a 4
  const cameraHeight = 2; // Reducido de 4 a 2
  const smoothness = 0.15; // Más suave
  
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
    const { horizontal, vertical } = getCameraAngle();
    
    // Calcular posición de la cámara basada en el ángulo
    const horizontalDistance = cameraDistance * Math.cos(vertical);
    const verticalOffset = cameraHeight + cameraDistance * Math.sin(vertical);
    
    targetPosition.current.set(
      playerPosition.x + horizontalDistance * Math.sin(horizontal),
      playerPosition.y + verticalOffset,
      playerPosition.z + horizontalDistance * Math.cos(horizontal)
    );

    // Suavizar movimiento de la cámara
    currentPosition.current.lerp(targetPosition.current, smoothness);
    camera.position.copy(currentPosition.current);
    
    // Hacer que la cámara mire al jugador
    camera.lookAt(playerPosition);
  });

  return null; // Este componente no renderiza nada visual
}
