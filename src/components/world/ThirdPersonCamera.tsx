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

export default function ThirdPersonCamera({ }: ThirdPersonCameraProps) {
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
    // Verificar si estamos conduciendo y usar la posición del vehículo
    const w = window as unknown as { 
      _veh_pos?: { x: number; y: number; z: number }; 
      _veh_yaw?: number;
      _isDriving?: boolean 
    };
    const vehPos = w._veh_pos;
    const vehYaw = w._veh_yaw ?? 0;
    const isDriving = w._isDriving;
    
    // p = punto al que mira la cámara (ancla). target = posición deseada de la cámara
    let anchor: THREE.Vector3;
    
    if (isDriving && vehPos) {
      // Ancla: posición del vehículo
      anchor = new THREE.Vector3(vehPos.x, vehPos.y + 1.0, vehPos.z);
    } else {
      // Seguir al jugador
      anchor = new THREE.Vector3(position.x, position.y, position.z);
    }
    
    const p = anchor;
    const { horizontal: yaw, vertical: pitch } = getCameraState();

    // Ajustar distancia y altura si estamos conduciendo
    const baseDistance = isDriving ? cameraDistance * 2.2 : cameraDistance; // Aumentado de 1.5 a 2.2
    const height = isDriving ? cameraHeight * 1.3 : cameraHeight; // Aumentado de 1.2 a 1.3
    const smooth = isDriving ? smoothness * 0.8 : smoothness;

    let target: THREE.Vector3;
    if (isDriving && vehPos) {
      // Offset detrás del vehículo: si el forward local es ( -sin(yaw), -cos(yaw) ),
      // el vector hacia atrás es ( +sin(yaw), +cos(yaw) )
      const back = new THREE.Vector3(
        Math.sin(vehYaw) * baseDistance,
        height,
        Math.cos(vehYaw) * baseDistance
      );
      target = p.clone().add(back);
    } else {
      const horizontalDist = baseDistance * Math.cos(pitch);
      // Detrás del jugador según yaw de mouse
      const camOffset = new THREE.Vector3(
        -Math.sin(yaw) * horizontalDist,
        height + baseDistance * Math.sin(pitch),
        -Math.cos(yaw) * horizontalDist
      );
      target = p.clone().add(camOffset);
    }
    
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
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && obj.visible) {
          // Filtrar por userData también
          const isPlayer = obj.userData?.isPlayer || obj.userData?.isRemotePlayer;
          const isPlayerMesh = obj.name.includes('player-mesh') || obj.name.includes('remotePlayer-mesh');
          const isVehicle = obj.userData?.vehicleId; // 🚗 Excluir vehículos
          if (!isPlayer && !isPlayerMesh && !isVehicle) {
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
