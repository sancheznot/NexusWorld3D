'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface HotelHumboldtProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

function HotelModel({ position, rotation, scale }: HotelHumboldtProps) {
  const meshRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/hotel_humboldt_model.glb');

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
      console.log('🏨 Hotel Humboldt modelo optimizado cargado (414KB)');
    }
  }, [scene]);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function HotelPlaceholder({ position, rotation, scale }: HotelHumboldtProps) {
  const meshRef = useRef<THREE.Group>(null);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      {/* Base del hotel */}
      <mesh castShadow receiveShadow userData={{ isCollider: true, collisionType: 'building' }}>
        <boxGeometry args={[30, 15, 30]} />
        <meshStandardMaterial color={0x8b4513} roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Segundo piso */}
      <mesh position={[0, 22.5, 0]} castShadow receiveShadow userData={{ isCollider: true, collisionType: 'building' }}>
        <boxGeometry args={[36, 15, 36]} />
        <meshStandardMaterial color={0x696969} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Tercer piso */}
      <mesh position={[0, 37.5, 0]} castShadow receiveShadow userData={{ isCollider: true, collisionType: 'building' }}>
        <boxGeometry args={[42, 12, 42]} />
        <meshStandardMaterial color={0x555555} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Techo */}
      <mesh position={[0, 48, 0]} castShadow receiveShadow userData={{ isCollider: true, collisionType: 'building' }}>
        <boxGeometry args={[48, 8, 48]} />
        <meshStandardMaterial color={0x333333} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Letrero "HOTEL HUMBOLDT" */}
      <mesh position={[0, 55, 24.5]} castShadow>
        <boxGeometry args={[20, 3, 0.5]} />
        <meshStandardMaterial color={0xffd700} emissive={0xffd700} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export default function HotelHumboldt(props: HotelHumboldtProps) {
  const [useRealModel] = useState(true);

  useFrame(() => {
    // Animación opcional del hotel
  });

  // Intentar cargar el modelo real optimizado (414KB), con fallback a placeholder
  if (useRealModel) {
    return (
      <Suspense fallback={<HotelPlaceholder {...props} />}>
        <HotelModel {...props} />
      </Suspense>
    );
  }

  return <HotelPlaceholder {...props} />;
}

