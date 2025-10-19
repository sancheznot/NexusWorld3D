'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface GLBTerrainProps {
  size?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export default function GLBTerrain({
  size = 100,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}: GLBTerrainProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [terrainLoaded, setTerrainLoaded] = useState(false);

  // Cargar el modelo de terreno (usaremos Terrain_02 como principal)
  const { scene } = useGLTF('/models/terrain/Terrain_02.glb');

  useEffect(() => {
    if (scene) {
      // Configurar sombras y colisiones para todos los objetos del terreno
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Habilitar colisiones
          child.userData.isCollider = true;
          child.userData.collisionType = 'terrain';
        }
      });
      setTerrainLoaded(true);
      console.log('🌍 Terreno GLB cargado exitosamente con colisiones');
    }
  }, [scene]);

  useFrame(() => {
    // Animación opcional del terreno
    if (meshRef.current) {
      // Rotación sutil para mostrar el modelo
      // meshRef.current.rotation.y += 0.0001;
    }
  });

  if (!terrainLoaded) {
    // Mostrar un placeholder mientras carga
    return (
      <group ref={meshRef} position={position} rotation={rotation}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size, size]} />
          <meshLambertMaterial color={0x4a5d23} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={meshRef} position={[position[0], position[1] - 1, position[2]]} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}
