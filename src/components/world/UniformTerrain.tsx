'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface UniformTerrainProps {
  worldSize?: number;
  tileSize?: number;
}

export default function UniformTerrain({
  worldSize = 100,
  tileSize = 20
}: UniformTerrainProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [loadedTerrains, setLoadedTerrains] = useState<THREE.Object3D[]>([]);

  // Cargar el modelo de terreno (useGLTF soporta Draco automáticamente)
  const { scene: terrainModel } = useGLTF('/models/terrain/Terrain_01.glb');

  useEffect(() => {
    if (!terrainModel) return;

    const terrains: THREE.Object3D[] = [];
    const tilesPerSide = Math.ceil(worldSize / tileSize);
    
    console.log(`🗺️ Creando ${tilesPerSide}x${tilesPerSide} tiles de terreno`);

    for (let x = 0; x < tilesPerSide; x++) {
      for (let z = 0; z < tilesPerSide; z++) {
        try {
          // Crear una instancia del modelo de terreno
          const terrainInstance = terrainModel.clone();
          
          // Posición del tile
          const tileX = (x - tilesPerSide / 2) * tileSize;
          const tileZ = (z - tilesPerSide / 2) * tileSize;
          
          terrainInstance.position.set(tileX, 0, tileZ); // Terreno al nivel del suelo
          
          // Escala para cubrir el área del tile (ajustado para Terrain_01)
          terrainInstance.scale.setScalar(tileSize / 5); // Ajustado para Terrain_01
          
          // Configurar colisiones y sombras
          terrainInstance.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.userData.isCollider = true;
              child.userData.collisionType = 'terrain';
            }
          });
          
          terrains.push(terrainInstance);
        } catch (error) {
          console.warn(`Error creando tile de terreno en (${x}, ${z}):`, error);
        }
      }
    }
    
    setLoadedTerrains(terrains);
    console.log(`✅ ${terrains.length} tiles de terreno creados`);
  }, [terrainModel, worldSize, tileSize]);

  useFrame(() => {
    // Animación sutil opcional
    if (groupRef.current) {
      // groupRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <group ref={groupRef}>
      {loadedTerrains.map((terrain, index) => (
        <primitive key={index} object={terrain} />
      ))}
    </group>
  );
}

