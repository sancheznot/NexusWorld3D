'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { modelLoader, ModelInfo } from '@/lib/three/modelLoader';
import * as THREE from 'three';

interface NatureDecorationsProps {
  worldSize?: number;
  density?: number; // 0-1, how many decorations per area
}

interface DecorationInstance {
  model: THREE.Object3D;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export default function NatureDecorations({ 
  worldSize = 100, 
  density = 0.3 
}: NatureDecorationsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [decorations, setDecorations] = useState<DecorationInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDecorations = async () => {
      try {
        setIsLoading(true);
        
        // Get nature models
        const natureModels = modelLoader.getNatureModels();
        console.log(`🌳 Loading ${natureModels.length} nature models:`, natureModels.map(m => m.name));
        const loadedModels: THREE.Object3D[] = [];
        
        // Load only lightweight models for better performance
        const keyModels = natureModels.slice(0, 3); // Load only first 3 models
        for (const modelInfo of keyModels) {
          try {
            console.log(`🔄 Attempting to load: ${modelInfo.name} from ${modelInfo.path}`);
            const model = await modelLoader.loadModel(modelInfo);
            loadedModels.push(model);
            console.log(`✅ Successfully loaded: ${modelInfo.name}`);
          } catch (error) {
            console.warn(`❌ Failed to load ${modelInfo.name}, using fallback:`, error);
            // Use fallback geometry
            const fallback = createFallbackDecoration(modelInfo.category);
            loadedModels.push(fallback);
          }
        }
        
        console.log(`🌳 Loaded ${loadedModels.length} models for decorations`);

        // Generate random decorations
        const decorations: DecorationInstance[] = [];
        const numDecorations = Math.floor(worldSize * worldSize * density / 100);
        
        for (let i = 0; i < numDecorations; i++) {
          const modelIndex = Math.floor(Math.random() * loadedModels.length);
          const model = loadedModels[modelIndex];
          
            // Random position within world bounds
            const x = (Math.random() - 0.5) * worldSize;
            const z = (Math.random() - 0.5) * worldSize;
            const y = 1; // On ground level
          
          // Random rotation
          const rotationY = Math.random() * Math.PI * 2;
          
          // Random scale variation
          const scale = 0.5 + Math.random() * 0.5;
          
          // Configurar colisiones para el modelo (sin sombras para mejor rendimiento)
          const modelClone = model.clone();
          modelClone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = false; // Deshabilitado para mejor rendimiento
              child.receiveShadow = false; // Deshabilitado para mejor rendimiento
              child.userData.isCollider = true;
              child.userData.collisionType = 'nature';
            }
          });
          
          decorations.push({
            model: modelClone,
            position: [x, y, z],
            rotation: [0, rotationY, 0],
            scale
          });
        }
        
        setDecorations(decorations);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load nature decorations:', error);
        setIsLoading(false);
      }
    };

    loadDecorations();
  }, [worldSize, density]);

  // Create fallback decoration when models fail to load
  const createFallbackDecoration = (category: string): THREE.Object3D => {
    let geometry: THREE.BufferGeometry;
    let color: number;
    
    switch (category) {
      case 'nature':
        // Grass/plant fallback
        geometry = new THREE.ConeGeometry(0.5, 2, 6);
        color = 0x4a5d23;
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        color = 0x8b4513;
    }
    
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  if (isLoading) {
    return (
      <group ref={groupRef}>
        {/* Loading placeholder */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={0x666666} transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      {decorations.map((decoration, index) => (
        <primitive
          key={index}
          object={decoration.model}
          position={decoration.position}
          rotation={decoration.rotation}
          scale={decoration.scale}
        />
      ))}
    </group>
  );
}
