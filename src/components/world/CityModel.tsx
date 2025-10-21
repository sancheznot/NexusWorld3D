'use client';

import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';

interface CityModelProps {
  modelPath: string;
  name?: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

export default function CityModel({
  modelPath,
  name = 'city',
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
}: CityModelProps) {
  const { scene } = useGLTF(modelPath);
  const physicsRef = useCannonPhysics(false);

  useEffect(() => {
    if (!scene || !physicsRef.current) return;

    // 1) Box colliders para UCX_* / collision*
    const boxes = physicsRef.current.createUCXBoxCollidersFromScene(
      scene,
      (n) => n.startsWith('UCX_') || n.includes('collision') || n.includes('Collision'),
      name
    );

    // 2) Trimesh colliders para colinas/terreno/rocas (nombres: Hill_, HIL_, Terrain_, Rock_)
    const hills = physicsRef.current.createNamedTrimeshCollidersFromScene(
      scene,
      (n) => /^(HIL|Hill|Rock|Cliff|Slope|Hill_)/i.test(n),
      `${name}-hills`
    );
    
    console.log(`✅ Ciudad: ${boxes} box colliders, ${hills} trimesh colliders`);
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
}

// Precarga
useGLTF.preload('/models/terrain/Terrain_01.glb');
