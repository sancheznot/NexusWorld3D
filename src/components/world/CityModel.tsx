'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { NATURAL_MESH_PATTERNS } from '@/constants/physics';
import { generateSceneLights } from '@/lib/three/sceneLights';
import { useTimeStore } from '@/store/timeStore';

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
  const url = useMemo(() => (modelPath.includes('?') ? modelPath : `${modelPath}?lm=1`), [modelPath]);
  const { scene } = useGLTF(url);
  const physicsRef = useCannonPhysics(true);
  const phase = useTimeStore((s) => s.phase);

  useEffect(() => {
    if (!scene || !physicsRef.current) return;

    physicsRef.current.removeBodiesByPrefix('hotel-interior');

    const boxes = physicsRef.current.createUCXBoxCollidersFromScene(
      scene,
      (n) => n.startsWith('UCX_') || n.includes('collision') || n.includes('Collision'),
      name
    );

    const hills = physicsRef.current.createNamedTrimeshCollidersFromScene(
      scene,
      (n) => NATURAL_MESH_PATTERNS.some(pattern => new RegExp(`${pattern}`, 'i').test(n)),
      `${name}-hills`
    );

    // Fallback rápido para carros y rigs complejos: collider por bounding box del grupo completo
    physicsRef.current.createBBoxCollidersFromScene(
      scene,
      (n, obj) => /CarRig_|Car_\d+/.test(n) && obj.type !== 'Bone',
      `${name}-cars` 
    );

    // Colliders para brazos de parking: detectar piezas largas/delgadas bajo "Parking_"
    physicsRef.current.createBBoxCollidersFromScene(
      scene,
      (n, obj) => {
        if (obj.type === 'Bone') return false;
        if (!/Parking_/i.test(n)) return false;
        const box = new THREE.Box3().setFromObject(obj);
        if (box.isEmpty()) return false;
        const size = box.getSize(new THREE.Vector3());
        const length = Math.max(size.x, size.z);
        const thickness = Math.min(size.x, size.z);
        // brazo típico: muy largo, poco espesor y altura baja
        return length / Math.max(thickness, 0.0001) > 4 && size.y < 1.5;
      },
      `${name}-parking-arms`
    );

    const isNightLike = phase === 'night' || phase === 'dusk';
    const isDawn = phase === 'dawn';

    const intensity = isNightLike ? 2.2 : isDawn ? 1.6 : 1.2;
    const distance = isNightLike ? 28 : isDawn ? 22 : 18;

    const created = generateSceneLights(scene, {
      patterns: [/^LM_/i],
      color: 0xfff2cc,
      intensity,
      distance,
      decay: 1.0,
      maxLights: 1024,
      debugHelpers: false,
      yOffset: 0.2,
    });

    console.log(`💡 Ciudad (LM_): ${created} luces auto`);
    console.log(`✅ Ciudad: ${boxes} box colliders, ${hills} trimesh colliders`);
  }, [scene, physicsRef, name, phase]);

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
