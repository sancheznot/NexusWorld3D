'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EnhancedTerrainProps {
  size?: number;
  position?: [number, number, number];
  segments?: number;
}

export default function EnhancedTerrain({ 
  size = 100, 
  position = [0, 0, 0],
  segments = 64
}: EnhancedTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create terrain geometry with more detail
  const { geometry, material } = useMemo(() => {
    // Create plane geometry with more segments for detail
    const planeGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Add some height variation to make it more interesting
    const vertices = planeGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Add subtle height variation
      const height = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
      vertices[i + 1] = height;
    }
    
    planeGeometry.attributes.position.needsUpdate = true;
    planeGeometry.computeVertexNormals();

    // Create material with texture-like appearance
    const material = new THREE.MeshLambertMaterial({
      color: 0x4a5d23, // Green base
      // Add some color variation
      vertexColors: false,
    });

    return { geometry: planeGeometry, material };
  }, [size, segments]);

  // Add subtle animation
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle swaying motion for grass-like effect
      const time = state.clock.getElapsedTime();
      meshRef.current.rotation.x = -Math.PI / 2 + Math.sin(time * 0.1) * 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  );
}
