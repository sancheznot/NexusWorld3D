'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface VariedTerrainProps {
  worldSize?: number;
  density?: number;
}

const TERRAIN_MODELS = [
  '/models/terrain/Terrain_02.glb',
  // Solo usar Terrain_02 para evitar problemas de colisión
];

export default function VariedTerrain({
  worldSize = 100,
  density = 0.1
}: VariedTerrainProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [loadedTerrains, setLoadedTerrains] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    const loadTerrains = async () => {
      const terrains: THREE.Object3D[] = [];
      const numTerrains = Math.floor(worldSize * worldSize * density / 100);

      for (let i = 0; i < numTerrains; i++) {
        try {
          // Seleccionar un modelo aleatorio
          const modelPath = TERRAIN_MODELS[Math.floor(Math.random() * TERRAIN_MODELS.length)];
          
          // Crear un grupo para este terreno
          const terrainGroup = new THREE.Group();
          
          // Posición aleatoria
          const x = (Math.random() - 0.5) * worldSize;
          const z = (Math.random() - 0.5) * worldSize;
          terrainGroup.position.set(x, -3, z);
          
          // Rotación aleatoria
          terrainGroup.rotation.y = Math.random() * Math.PI * 2;
          
          // Escala aleatoria
          const scale = 0.5 + Math.random() * 1.5;
          terrainGroup.scale.setScalar(scale);
          
          // Crear un placeholder mientras se carga el modelo real
          const placeholder = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshLambertMaterial({ 
              color: new THREE.Color().setHSL(0.3 + Math.random() * 0.2, 0.6, 0.4) 
            })
          );
          placeholder.rotation.x = -Math.PI / 2;
          terrainGroup.add(placeholder);
          
          terrains.push(terrainGroup);
        } catch (error) {
          console.warn(`Error creando terreno ${i}:`, error);
        }
      }
      
      setLoadedTerrains(terrains);
    };

    loadTerrains();
  }, [worldSize, density]);

  useFrame(() => {
    // Animación sutil de los terrenos
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        child.rotation.y += 0.0001 * (index % 2 === 0 ? 1 : -1);
      });
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
