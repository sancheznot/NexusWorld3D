'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createPlaneGeometry, createLambertMaterial } from '@/lib/three/loaders';
import * as THREE from 'three';

interface TerrainProps {
  size?: number;
  position?: [number, number, number];
}

export default function Terrain({ 
  size = 100, 
  position = [0, 0, 0] 
}: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create terrain material
  const material = createLambertMaterial(0x4a5d23);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
