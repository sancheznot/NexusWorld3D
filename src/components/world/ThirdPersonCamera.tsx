'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useMouseCamera } from '@/hooks/useMouseCamera';
import * as THREE from 'three';
import { GAME_CONFIG } from '@/constants/game';

interface ThirdPersonCameraProps {
  target?: THREE.Object3D;
}

export default function ThirdPersonCamera({ target: _target }: ThirdPersonCameraProps) {
  const { camera, scene } = useThree();
  const { position } = usePlayerStore();
  const { getCameraState } = useMouseCamera(true); // MISMA instancia global
  
  // Configuración de la cámara desde constantes
  const cameraDistance = GAME_CONFIG.camera.distance;
  const cameraHeight = GAME_CONFIG.camera.height;
  const smoothness = GAME_CONFIG.camera.smoothness;
  const collisionOffset = GAME_CONFIG.camera.collisionOffset;
  
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
    // Cámara DETRÁS del personaje: restar el offset en lugar de sumar
    const camOffset = new THREE.Vector3(
      -Math.sin(yaw) * horizontalDist,  // Negativo para estar detrás
      height + baseDistance * Math.sin(pitch),
      -Math.cos(yaw) * horizontalDist   // Negativo para estar detrás
    );

    let target = p.clone().add(camOffset);
    
    // Colisiones de cámara: solo si está habilitado en config
    if (GAME_CONFIG.camera.enableCollision) {
      const ray = new THREE.Raycaster();
      const dir = target.clone().sub(p).normalize();
      const maxDist = target.distanceTo(p); // limitar el rayo al destino previsto
      ray.set(p, dir);
      ray.near = 0.05;
      ray.far = maxDist;
      const ignoreRe = /(sky|skybox|cloud|helper|axes|grid|player|character|man-all|woman-all|men-all|women-all|remotePlayer|player-mesh|remotePlayer-mesh)/i;
      // Construir candidatos: todos los meshes visibles de la escena
      const candidates: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        const any = obj as any;
        if (any.isMesh && obj.visible) {
          // Filtrar por userData también
          const isPlayer = obj.userData?.isPlayer || obj.userData?.isRemotePlayer;
          const isPlayerMesh = obj.name.includes('player-mesh') || obj.name.includes('remotePlayer-mesh');
          if (!isPlayer && !isPlayerMesh) {
            candidates.push(obj);
          }
        }
      });
      const intersects = ray
        .intersectObjects(candidates, true)
        .filter((hit) => hit.distance > 0.05 && !ignoreRe.test(hit.object.name));
      if (intersects.length > 0) {
        const hit = intersects[0];
        const clampedDist = Math.max(GAME_CONFIG.camera.minClearance, hit.distance - collisionOffset);
        target = p.clone().add(dir.multiplyScalar(clampedDist));
      }
    }
    
    // LIMITAR altura mínima de la cámara para que no atraviese el piso
    const minCameraHeight = 0.5; // Altura mínima sobre el suelo
    if (target.y < minCameraHeight) {
      target.y = minCameraHeight;
    }
    
    currentPosition.current.lerp(target, smooth);
    camera.position.copy(currentPosition.current);
    camera.lookAt(p);
  });

  return null; // Este componente no renderiza nada visual
}
