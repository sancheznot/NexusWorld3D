'use client';

import { useRef, useEffect, useState } from 'react';
import { modelLoader } from '@/lib/three/modelLoader';
import { useWorldObjectsStore } from '@/store/worldObjectsStore';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
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
  id: string;
  type: 'tree' | 'rock' | 'grass' | 'plant';
}

export default function NatureDecorations({ 
  worldSize = 100, 
  density = 0.3 
}: NatureDecorationsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [decorations, setDecorations] = useState<DecorationInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const physicsRef = useCannonPhysics();
  const { getDecorations, setDecorations: saveDecorations } = useWorldObjectsStore();
  const collidersCreatedRef = useRef(false);

  useEffect(() => {
    const loadDecorations = async () => {
      try {
        setIsLoading(true);
        
        // 🔥 PRIMERO: Intentar cargar decoraciones guardadas del store
        const savedDecorations = getDecorations();
        
        if (savedDecorations && savedDecorations.length > 0) {
          console.log(`💾 Loading ${savedDecorations.length} decorations from store (FIXED positions)`);
          
          // Cargar modelos
          const natureModels = modelLoader.getNatureModels();
          const loadedModels: THREE.Object3D[] = [];
          const keyModels = natureModels.slice(0, 3);
          
          for (const modelInfo of keyModels) {
            try {
              const model = await modelLoader.loadModel(modelInfo);
              loadedModels.push(model);
            } catch {
              const fallback = createFallbackDecoration(modelInfo.category);
              loadedModels.push(fallback);
            }
          }
          
          // Recrear decoraciones con las posiciones guardadas
          const recreatedDecorations: DecorationInstance[] = savedDecorations.map((saved) => {
            const model = loadedModels[saved.modelIndex % loadedModels.length];
            const modelClone = model.clone();
            
            modelClone.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                child.userData.isCollider = true;
                child.userData.collisionType = 'nature';
              }
            });
            
            return {
              model: modelClone,
              position: saved.position,
              rotation: [0, saved.rotation, 0] as [number, number, number],
              scale: saved.scale,
              id: saved.id,
              type: saved.type
            };
          });
          
          setDecorations(recreatedDecorations);
          setIsLoading(false);
          console.log('✅ Decorations loaded from store with FIXED positions!');
          return;
        }
        
        // 🆕 SI NO HAY GUARDADAS: Generar nuevas decoraciones ALEATORIAS
        console.log('🎲 No saved decorations found, generating NEW random decorations...');
        
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
          } catch (err) {
            console.warn(`❌ Failed to load ${modelInfo.name}, using fallback:`, err);
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
          
          // Determinar tipo basado en el índice del modelo
          const type: 'tree' | 'rock' = modelIndex === 0 ? 'tree' : 'rock';
          const id = `decoration-${type}-${i}`;
          
          decorations.push({
            model: modelClone,
            position: [x, y, z],
            rotation: [0, rotationY, 0],
            scale,
            id,
            type
          });
        }
        
        setDecorations(decorations);
        
        // 💾 GUARDAR decoraciones en el store para que sean persistentes
        const decorationsToSave = decorations.map(d => ({
          id: d.id,
          type: d.type,
          position: d.position,
          rotation: d.rotation[1], // Solo Y rotation
          scale: d.scale,
          modelIndex: decorations.indexOf(d) % loadedModels.length
        }));
        saveDecorations(decorationsToSave);
        console.log(`💾 Saved ${decorationsToSave.length} decorations to store for future loads`);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load nature decorations:', err);
        setIsLoading(false);
      }
    };

    loadDecorations();
  }, [worldSize, density, getDecorations, saveDecorations]);

  // Crear colliders de física para las decoraciones (solo una vez)
  useEffect(() => {
    console.log(`🔍 Collider check: physicsRef=${!!physicsRef.current}, decorations=${decorations.length}, collidersCreated=${collidersCreatedRef.current}`);
    
    if (!physicsRef.current || decorations.length === 0 || collidersCreatedRef.current) {
      console.log(`⚠️ Skipping collider creation: physicsRef=${!!physicsRef.current}, decorations=${decorations.length}, collidersCreated=${collidersCreatedRef.current}`);
      return;
    }

    console.log(`🔨 Creating ${decorations.length} colliders for decorations...`);

    decorations.forEach((decoration) => {
      const [x, y, z] = decoration.position;
      
      if (decoration.type === 'tree') {
        // Collider cilíndrico para árboles
        const radius = 0.5 * decoration.scale;
        const height = 5 * decoration.scale;
        physicsRef.current?.createTreeCollider([x, y, z], radius, height, decoration.id);
      } else if (decoration.type === 'rock') {
        // Collider esférico para rocas
        const radius = 1.0 * decoration.scale;
        physicsRef.current?.createRockCollider([x, y, z], radius, decoration.id);
      }
      // grass y plant no tienen collider (muy pequeños)
    });

    collidersCreatedRef.current = true;
    console.log(`✅ All colliders created!`);
  }, [decorations, physicsRef]);

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
      {decorations.map((decoration) => (
        <primitive
          key={decoration.id}
          object={decoration.model}
          position={decoration.position}
          rotation={decoration.rotation}
          scale={decoration.scale}
        />
      ))}
    </group>
  );
}
