'use client';

import { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface GreenDomeStructureProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

function DomeModel({ position, rotation, scale }: GreenDomeStructureProps) {
  const meshRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/Green_Dome_Structure.glb');

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.isCollider = true;
          child.userData.collisionType = 'building';
        }
      });
      console.log('🏛️ Green Dome Structure optimizado cargado (1.8MB)');
    }
  }, [scene]);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function DomePlaceholder({ position, rotation, scale }: GreenDomeStructureProps) {
  const meshRef = useRef<THREE.Group>(null);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      {/* Base de la estructura */}
      <mesh castShadow receiveShadow userData={{ isCollider: true, collisionType: 'building' }}>
        <cylinderGeometry args={[8, 8, 6, 16]} />
        <meshStandardMaterial color={0x4a5d23} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Domo verde */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow userData={{ isCollider: true, collisionType: 'building' }}>
        <sphereGeometry args={[6, 16, 8]} />
        <meshStandardMaterial color={0x2d5016} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Detalles decorativos */}
      <mesh position={[0, 8, 0]} castShadow>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={0xffd700} emissive={0xffd700} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export default function GreenDomeStructure(props: GreenDomeStructureProps) {
  useFrame(() => {
    // Animación opcional de la estructura
  });

  // Cargar el modelo optimizado (1.8MB) con fallback a placeholder
  return (
    <Suspense fallback={<DomePlaceholder {...props} />}>
      <DomeModel {...props} />
    </Suspense>
  );
}

