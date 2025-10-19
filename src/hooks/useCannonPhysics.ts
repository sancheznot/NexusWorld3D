'use client';

import { useRef, useEffect } from 'react';
import { CannonPhysics } from '@/lib/three/cannonPhysics';

export function useCannonPhysics() {
  const physicsRef = useRef<CannonPhysics | null>(null);

  useEffect(() => {
    // Inicializar física
    physicsRef.current = new CannonPhysics();
    
    // Crear suelo
    physicsRef.current.createGround(100);
    
    // Crear jugador
    physicsRef.current.createPlayer({ x: 0, y: 0.5, z: 0 });

    return () => {
      if (physicsRef.current) {
        physicsRef.current.dispose();
      }
    };
  }, []);

  return physicsRef;
}
