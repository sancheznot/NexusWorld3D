'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

import { usePlayerStore } from '@/store/playerStore';

interface PortalEffectProps {
  position: [number, number, number];
  radius: number;
  color?: string;
  intensity?: number;
  icon?: string;
}

export default function PortalEffect({ 
  position, 
  radius, 
  color = '#ff6b35', 
  intensity = 2,
  icon = '🏨',
}: PortalEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const [showIcon, setShowIcon] = useState(false);

  // Crear geometría de partículas
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(50 * 3);
    const colors = new Float32Array(50 * 3);
    
    for (let i = 0; i < 50; i++) {
      const i3 = i * 3;
      // Posiciones aleatorias en un cilindro
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.8;
      positions[i3] = Math.cos(angle) * r;
      positions[i3 + 1] = Math.random() * 3; // Altura variable
      positions[i3 + 2] = Math.sin(angle) * r;
      
      // Colores anaranjados
      colors[i3] = 1; // R
      colors[i3 + 1] = 0.4 + Math.random() * 0.3; // G
      colors[i3 + 2] = 0.1; // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, [radius]);

  // Material de partículas
  const particlesMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.05, // Reducido de 0.1 a 0.05
      vertexColors: true,
      transparent: true,
      opacity: 0.3, // Reducido de 0.8 a 0.3
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Geometría del anillo (más pequeño)
  const ringGeometry = useMemo(() => {
    const geometry = new THREE.RingGeometry(radius * 0.3, radius * 0.6, 32); // Reducido significativamente
    return geometry;
  }, [radius]);

  // Material del anillo
  const ringMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.05, // Aún más reducido
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [color]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Rotar el grupo
    groupRef.current.rotation.y = time * 0.5;
    
    // Animar el anillo
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.3;
      ringRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
    }
    
    // Animar partículas
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.2;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + i) * 0.01; // Movimiento vertical
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Parpadear la luz (muy suave)
    if (lightRef.current) {
      lightRef.current.intensity = intensity * 0.1 + Math.sin(time * 2) * 0.02; // Muchísimo más suave
    }

    // Check distance for icon visibility
    const playerPos = usePlayerStore.getState().position;
    if (playerPos && icon) {
      const distSq = 
        Math.pow(position[0] - playerPos.x, 2) +
        Math.pow(position[1] - playerPos.y, 2) +
        Math.pow(position[2] - playerPos.z, 2);
      
      const shouldShow = distSq <= 289; // 17^2
      if (shouldShow !== showIcon) setShowIcon(shouldShow);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Luz puntual */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={intensity}
        distance={radius * 3}
        decay={2}
      />
      
      {/* Anillo en el suelo */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={ringGeometry} />
        <primitive object={ringMaterial} />
      </mesh>
      
      {/* Partículas flotantes */}
      <points ref={particlesRef}>
        <primitive object={particlesGeometry} />
        <primitive object={particlesMaterial} />
      </points>
      
      {/* Luz direccional hacia arriba (muy suave) */}
      <directionalLight
        color={color}
        intensity={intensity * 0.02} // Reducido aún más
        position={[0, 2, 0]}
        target-position={[0, 0, 0]}
      />
      {/* Icono del portal flotando (solo si el jugador está cerca) */}
      {icon && showIcon && (
        <Html 
          position={[0, 1, 0]} 
          center
        >
          <div className="text-3xl text-white drop-shadow-lg bg-black bg-opacity-50 rounded-full px-2 py-1">
            {icon}
          </div>
        </Html>
      )}

    </group>
  );
}
