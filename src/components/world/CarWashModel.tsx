'use client';

import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Mesh, Box3, Vector3 } from 'three';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { ShapeType, threeToCannon } from 'three-to-cannon';

interface ModelProps {
  modelPath: string;
  name?: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  type?: ShapeType;
}

export default function CarWashModel({
  modelPath,
  name = 'generic-model',
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  type = ShapeType.MESH, // 👈 por defecto: sólido
}: ModelProps) {
  const { scene } = useGLTF(modelPath);
  const physicsRef = useCannonPhysics(false);

  useEffect(() => {
    if (!scene || !physicsRef.current) return;

    // Reutilizable: crear colliders automáticos UCX (Box/Trimesh según complejidad)
    const created = physicsRef.current.createUCXAutoCollidersFromScene(
      scene,
      name
    );
    if (created === 0) {
      console.log('❌ No se encontraron meshes UCX_* en el modelo');
    }
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

useGLTF.preload('/models/car-wash.glb');
