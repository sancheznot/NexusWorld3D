'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CannonPhysics } from '@/lib/three/cannonPhysics';
import cannonDebugger from 'cannon-es-debugger';

export function useCannonPhysics() {
  const physicsRef = useRef<CannonPhysics | null>(null);
  const debugRendererRef = useRef<{ update: () => void } | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    // Inicializar física
    physicsRef.current = new CannonPhysics();
    
    // Crear suelo
    physicsRef.current.createGround(100);
    
    // Crear jugador (Y=1.05 para evitar rebotes en el suelo)
    physicsRef.current.createPlayer({ x: 0, y: 1.05, z: 0 });

    // 🔍 ACTIVAR DEBUGGER VISUAL
    debugRendererRef.current = cannonDebugger(scene, physicsRef.current.getWorld(), {
      color: 0x00ff00, // Verde brillante para ver los mesh
      scale: 1.0,
    });
    
    console.log('🔍 Cannon.js debugger visual ACTIVADO - Verás los mesh de física en VERDE');

    return () => {
      if (physicsRef.current) {
        physicsRef.current.dispose();
      }
    };
  }, [scene]);

  // Actualizar debugger en cada frame
  useFrame(() => {
    if (debugRendererRef.current && physicsRef.current) {
      debugRendererRef.current.update();
    }
  });

  return physicsRef;
}
