'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import * as THREE from 'three';
import { THREE_CONFIG } from '@/config/three.config';

interface SideScrollCameraProps {
  // Optional override for distance/height
  distance?: number;
  height?: number;
  fov?: number;
}

export default function SideScrollCamera({ 
  distance = THREE_CONFIG.camera.sideScroller.distance,
  height = THREE_CONFIG.camera.sideScroller.height,
  fov = THREE_CONFIG.camera.sideScroller.fov
}: SideScrollCameraProps) {
  const { camera } = useThree();
  const { position } = usePlayerStore();
  
  // Smooth reference
  const currentPosition = useRef(new THREE.Vector3(0, 5, 20));
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    // Ajustar FOV para efecto 2.5D
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    // Set initial position
    camera.position.set(0, height, distance);
  }, [camera, fov, height, distance]);

  useFrame((state, delta) => {
    // Target siempre es el jugador, pero podemos ajustar el offset Y
    const targetX = position.x;
    const targetY = position.y + 1.0; // Mirar al centro del cuerpo
    const targetZ = position.z;

    // Posición deseada de la cámara:
    // - Sigue la X del jugador
    // - Sigue la Y del jugador (suavizado)
    // - Mantiene Z fija (distancia)
    const desiredCamX = targetX;
    const desiredCamY = targetY + height;
    const desiredCamZ = targetZ + distance; // Para vista lateral pura, podríamos fijar Z si el mundo es recto

    // LERP suave
    // Usamos un lerp factor ajustado por delta para consistencia de framerate
    const lerpFactor = 1.0 - Math.pow(0.001, delta); // Muy rápido
    
    currentPosition.current.x = THREE.MathUtils.lerp(currentPosition.current.x, desiredCamX, lerpFactor);
    currentPosition.current.y = THREE.MathUtils.lerp(currentPosition.current.y, desiredCamY, lerpFactor);
    currentPosition.current.z = THREE.MathUtils.lerp(currentPosition.current.z, desiredCamZ, lerpFactor);
    
    currentTarget.current.x = THREE.MathUtils.lerp(currentTarget.current.x, targetX, lerpFactor);
    currentTarget.current.y = THREE.MathUtils.lerp(currentTarget.current.y, targetY, lerpFactor);
    currentTarget.current.z = THREE.MathUtils.lerp(currentTarget.current.z, targetZ, lerpFactor);

    camera.position.copy(currentPosition.current);
    camera.lookAt(currentTarget.current);
  });

  return null;
}
