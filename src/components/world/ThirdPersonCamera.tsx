'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useMouseCamera } from '@/hooks/useMouseCamera';
import * as THREE from 'three';

interface ThirdPersonCameraProps {
  target?: THREE.Object3D;
}

export default function ThirdPersonCamera({ target: _target }: ThirdPersonCameraProps) {
  const { camera } = useThree();
  const { position } = usePlayerStore();
  const { getCameraState } = useMouseCamera(true); // MISMA instancia global
  
  // Configuración de la cámara - más cerca del personaje
  const cameraDistance = 6; // Distancia base
  const cameraHeight = 2; // Altura base
  const smoothness = 0.15; // Más suave
  
  // Estado de la cámara
  const currentPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 1000;
    (camera as THREE.PerspectiveCamera).fov = 75;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    const p = new THREE.Vector3(position.x, position.y, position.z);
    const { horizontal: yaw, vertical: pitch } = getCameraState();

    const baseDistance = cameraDistance;
    const height = cameraHeight;
    const smooth = smoothness;

    const horizontalDist = baseDistance * Math.cos(pitch);
    const camOffset = new THREE.Vector3(
      Math.sin(yaw) * horizontalDist,
      height + baseDistance * Math.sin(pitch),
      Math.cos(yaw) * horizontalDist
    );

    const target = p.clone().add(camOffset);
    currentPosition.current.lerp(target, smooth);
    camera.position.copy(currentPosition.current);
    camera.lookAt(p);
  });

  return null; // Este componente no renderiza nada visual
}
