'use client';

import { useEffect, memo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { NATURAL_MESH_PATTERNS } from '@/constants/physics';

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

    // 2) Trimesh colliders para elementos naturales del interior
    const interiorElements = physicsRef.current.createNamedTrimeshCollidersFromScene(
      scene,
      (n) => NATURAL_MESH_PATTERNS.some(pattern => new RegExp(`^${pattern}`, 'i').test(n)),
      `${name}-interior`
    );
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
