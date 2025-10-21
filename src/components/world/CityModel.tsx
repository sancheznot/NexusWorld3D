'use client';

import { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { NATURAL_MESH_PATTERNS } from '@/constants/physics';
import UniformTerrain from './UniformTerrain';

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
  const [modelError, setModelError] = useState(false);
  const { scene } = useGLTF(modelPath);
  const physicsRef = useCannonPhysics(false);

  useEffect(() => {
    if (!scene || !physicsRef.current) {
      // If no scene after loading, trigger fallback
      if (!scene) {
        setModelError(true);
      }
      return;
    }

    // 1) Box colliders para UCX_* / collision*
    const boxes = physicsRef.current.createUCXBoxCollidersFromScene(
      scene,
      (n) => n.startsWith('UCX_') || n.includes('collision') || n.includes('Collision'),
      name
    );

    // 2) Trimesh colliders para colinas/terreno/rocas (usando constantes centralizadas)
    const hills = physicsRef.current.createNamedTrimeshCollidersFromScene(
      scene,
      (n) => NATURAL_MESH_PATTERNS.some(pattern => new RegExp(`^${pattern}`, 'i').test(n)),
      `${name}-hills`
    );
    
    console.log(`✅ Ciudad: ${boxes} box colliders, ${hills} trimesh colliders`);
  }, [scene, physicsRef, name]);

  // 🎯 Fallback: Si el modelo no existe, usar terreno público
  if (modelError || !scene) {
    console.log(`🔄 Usando fallback: UniformTerrain para ${name}`);
    return (
      <group position={position}>
        <UniformTerrain 
          worldSize={100} 
          tileSize={25}
        />
      </group>
    );
  }

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
useGLTF.preload('/models/city.glb');
