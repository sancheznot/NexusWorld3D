'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CannonPhysics } from '@/lib/three/cannonPhysics';
import cannonDebugger from 'cannon-es-debugger';
import { GAME_CONFIG } from '@/constants/game';

// Singleton global para evitar múltiples instancias
let globalPhysics: CannonPhysics | null = null;
let globalDebugRenderer: { update: () => void } | null = null;
let initializationCount = 0;

// Acceso seguro a la instancia global de física SIN usar hooks de R3F
export function getPhysicsInstance(): CannonPhysics | null {
  return globalPhysics;
}

export function useCannonPhysics(createPhysicsBody: boolean = true) {
  const physicsRef = useRef<CannonPhysics | null>(null);
  const debugRendererRef = useRef<{ update: () => void } | null>(null);
  // Suscribirse solo a `scene` para evitar re-render por frame
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    initializationCount++;
    // console.log(`🔧 useCannonPhysics: Initialization #${initializationCount}`);

    // Si no se debe crear physics body, solo retornar la referencia existente
    if (!createPhysicsBody) {
      physicsRef.current = globalPhysics;
      debugRendererRef.current = globalDebugRenderer;
      // console.log('🚫 No crear physics body para jugador remoto');
      return;
    }

    // Si ya existe una instancia global, usarla
    if (globalPhysics) {
      physicsRef.current = globalPhysics;
      debugRendererRef.current = globalDebugRenderer;
      // console.log('♻️ Reusing existing physics instance');
      return;
    }

    // Crear nueva instancia solo si no existe
    // console.log('🆕 Creating new physics instance');
    globalPhysics = new CannonPhysics();
    physicsRef.current = globalPhysics;
    
    // Crear suelo
    physicsRef.current.createGround();
    
    // Crear jugador en la posición inicial
    physicsRef.current.createPlayer(GAME_CONFIG.player.spawnPosition);

    // 🔍 ACTIVAR DEBUGGER VISUAL solo en desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      globalDebugRenderer = cannonDebugger(scene, physicsRef.current.getWorld(), {
        color: 0x00ff00, // Verde brillante para ver los mesh
        scale: 1.0,
        // Filtrar shapes con geometría inválida para el debugger
        onInit(_body: unknown, mesh: unknown) {
          const m = mesh as { geometry?: { attributes?: { position?: { getX: (i: number) => number } } } };
          if (!m?.geometry?.attributes?.position) return false;
          const p = m.geometry.attributes.position;
          const ok = Number.isFinite(p.getX(0));
          return !!ok;
        }
      });
      debugRendererRef.current = globalDebugRenderer;
      
      // console.log('🔍 Cannon.js debugger visual ACTIVADO - Verás los mesh de física en VERDE');
    } else {
      // console.log('🚀 Producción: Debugger visual DESACTIVADO');
    }

    return () => {
      initializationCount--;
      // console.log(`🔧 useCannonPhysics: Cleanup, remaining instances: ${initializationCount}`);
      
      // Solo limpiar cuando no queden más instancias
      if (initializationCount <= 0 && globalPhysics) {
        // console.log('🧹 Disposing global physics instance');
        globalPhysics.dispose();
        globalPhysics = null;
        globalDebugRenderer = null;
      }
    };
  }, [scene, createPhysicsBody]);

  // Actualizar debugger en cada frame
  useFrame(() => {
    if (debugRendererRef.current && physicsRef.current) {
      try {
        debugRendererRef.current.update();
      } catch {
        // Evitar crasheos de debug cuando hay geometrías inválidas (e.g., NaN)
      }
    }
  });

  return physicsRef;
}
