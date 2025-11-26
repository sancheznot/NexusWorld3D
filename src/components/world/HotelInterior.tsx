'use client';

import { useEffect, memo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { GAME_CONFIG } from '@/constants/game';
import * as THREE from 'three';

// ...

// Usage example (assuming it's used somewhere)
// const patterns = GAME_CONFIG.physics.patterns.naturalMesh;

interface HotelInteriorProps {
  modelPath: string;
  name?: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

const HotelInterior = memo(function HotelInterior({
  modelPath,
  name = 'hotel-interior',
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
}: HotelInteriorProps) {
  console.log(`🏨 HotelInterior RENDER - modelPath: ${modelPath}`);
  const { scene } = useGLTF(modelPath);
  const physicsRef = useCannonPhysics(true);

  useEffect(() => {
    if (!scene || !physicsRef.current) {
      return;
    }

    // Limpiar colliders del mapa anterior (city) y del propio prefijo por seguridad
    physicsRef.current.removeBodiesByPrefix('city');
    physicsRef.current.removeBodiesByPrefix(`${name}-`);

    // 1) Box colliders para UCX_* / collision*
    const boxes = physicsRef.current.createUCXBoxCollidersFromScene(
      scene,
      (n) => n.startsWith('UCX_') || n.includes('collision') || n.includes('Collision'),
      name
    );

    // Filtrar solo meshes que coincidan con patrones naturales (rocas, colinas, etc)
    const naturalMeshes: THREE.Mesh[] = [];
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Verificar si el nombre coincide con algún patrón
        const isNatural = GAME_CONFIG.physics.patterns.naturalMesh.some(pattern => child.name.includes(pattern));
        
        if (isNatural) {
          naturalMeshes.push(child);
        }
      }
    });
    // 2) Trimesh colliders para elementos naturales del interior
    // physicsRef.current.createNamedTrimeshCollidersFromScene(
    //   scene,
    //   (n) => NATURAL_MESH_PATTERNS.some(pattern => new RegExp(`^${pattern}`, 'i').test(n)),
    //   `${name}-interior`
    // );
  }, [scene, physicsRef, name]);

  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
});

export default HotelInterior;

// Precarga del modelo
useGLTF.preload('/models/maps/main_map/main_building/interior-hotel.glb');
