'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CannonPhysics } from '@/lib/three/cannonPhysics';
import cannonDebugger from 'cannon-es-debugger';

// Singleton global para evitar múltiples instancias
let globalPhysics: CannonPhysics | null = null;
let globalDebugRenderer: { update: () => void } | null = null;
let initializationCount = 0;

export function useCannonPhysics(createPhysicsBody: boolean = true) {
  const physicsRef = useRef<CannonPhysics | null>(null);
  const debugRendererRef = useRef<{ update: () => void } | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    initializationCount++;
    console.log(`🔧 useCannonPhysics: Initialization #${initializationCount}`);

    // Si no se debe crear physics body, solo retornar la referencia existente
    if (!createPhysicsBody) {
      physicsRef.current = globalPhysics;
      debugRendererRef.current = globalDebugRenderer;
      console.log('🚫 No crear physics body para jugador remoto');
      return;
    }

    // Si ya existe una instancia global, usarla
    if (globalPhysics) {
      physicsRef.current = globalPhysics;
      debugRendererRef.current = globalDebugRenderer;
      console.log('♻️ Reusing existing physics instance');
      return;
    }

    // Crear nueva instancia solo si no existe
    console.log('🆕 Creating new physics instance');
    globalPhysics = new CannonPhysics();
    physicsRef.current = globalPhysics;
    
    // Crear suelo
    physicsRef.current.createGround();
    
    // Crear jugador (Y=1.05 para evitar rebotes en el suelo)
    physicsRef.current.createPlayer({ x: 10, y: 1.05, z: 10 });

    // 🔍 ACTIVAR DEBUGGER VISUAL
    globalDebugRenderer = cannonDebugger(scene, physicsRef.current.getWorld(), {
      color: 0x00ff00, // Verde brillante para ver los mesh
      scale: 1.0,
    });
    debugRendererRef.current = globalDebugRenderer;
    
    console.log('🔍 Cannon.js debugger visual ACTIVADO - Verás los mesh de física en VERDE');

    return () => {
      initializationCount--;
      console.log(`🔧 useCannonPhysics: Cleanup, remaining instances: ${initializationCount}`);
      
      // Solo limpiar cuando no queden más instancias
      if (initializationCount <= 0 && globalPhysics) {
        console.log('🧹 Disposing global physics instance');
        globalPhysics.dispose();
        globalPhysics = null;
        globalDebugRenderer = null;
      }
    };
  }, [scene, createPhysicsBody]);

  // Actualizar debugger en cada frame
  useFrame(() => {
    if (debugRendererRef.current && physicsRef.current) {
      debugRendererRef.current.update();
    }
  });

  return physicsRef;
}
