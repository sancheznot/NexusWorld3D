'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useTestingCamera } from '@/hooks/useTestingCamera';
import * as THREE from 'three';

export default function TestingCamera() {
  const { camera } = useThree();
  const { position } = usePlayerStore();
  const { isActive, height, distance } = useTestingCamera();
  
  const originalPosition = useRef(new THREE.Vector3());
  const originalLookAt = useRef(new THREE.Vector3());
  const isOriginalSaved = useRef(false);

  useEffect(() => {
    if (isActive && !isOriginalSaved.current) {
      // Guardar posición original de la cámara
      originalPosition.current.copy(camera.position);
      camera.lookAt(new THREE.Vector3(position.x, position.y, position.z));
      originalLookAt.current.copy(camera.position);
      isOriginalSaved.current = true;
      console.log('🔍 Cámara de testing activada - vista desde arriba');
    } else if (!isActive && isOriginalSaved.current) {
      // Restaurar posición original
      camera.position.copy(originalPosition.current);
      isOriginalSaved.current = false;
      console.log('🔍 Cámara de testing desactivada - vista normal');
    }
  }, [isActive, camera, position]);

  useFrame(() => {
    if (isActive) {
      // Posicionar cámara desde arriba del jugador
      const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
      
      // Cámara desde arriba con distancia configurable
      camera.position.set(
        playerPosition.x + distance,
        playerPosition.y + height,
        playerPosition.z + distance
      );
      
      // Hacer que la cámara mire hacia el jugador
      camera.lookAt(playerPosition);
    }
  });

  return null; // No renderizar nada visual en el Canvas
}
