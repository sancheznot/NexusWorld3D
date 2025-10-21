'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import { Vector3, Mesh } from 'three';
import { Portal } from '@/types/portal.types';

interface PortalTriggerProps {
  portal: Portal;
  playerPosition: Vector3;
  onPlayerEnter: (portal: Portal) => void;
  onPlayerExit: () => void;
}

export default function PortalTrigger({ 
  portal, 
  playerPosition, 
  onPlayerEnter, 
  onPlayerExit 
}: PortalTriggerProps) {
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const triggerRef = useRef<Mesh>(null);

  // Calcular distancia entre jugador y portal
  useFrame(() => {
    if (!playerPosition) return;

    // Usar la posición absoluta del portal, no la posición relativa del trigger
    const portalPosition = new Vector3(portal.position.x, portal.position.y, portal.position.z);
    const distance = portalPosition.distanceTo(playerPosition);
    const wasNear = isPlayerNear;
    const nowNear = distance <= portal.radius;

    // Debug: solo mostrar cuando esté cerca
    if (distance < 20) {
      console.log(`Portal ${portal.id}: distancia=${distance.toFixed(2)}, radio=${portal.radius}, cerca=${nowNear}`);
    }

    if (nowNear && !wasNear) {
      console.log(`Jugador entró al portal: ${portal.id}`);
      setIsPlayerNear(true);
      onPlayerEnter(portal);
    } else if (!nowNear && wasNear) {
      console.log(`Jugador salió del portal: ${portal.id}`);
      setIsPlayerNear(false);
      onPlayerExit();
    }
  });

  // Efecto de activación visual
  useEffect(() => {
    if (isPlayerNear && !isActivated) {
      setIsActivated(true);
      // Efecto de sonido o partículas aquí
    } else if (!isPlayerNear && isActivated) {
      setIsActivated(false);
    }
  }, [isPlayerNear, isActivated]);

  return (
    <group position={[portal.position.x, portal.position.y, portal.position.z]}>
      {/* Trigger invisible */}
      <Sphere
        ref={triggerRef}
        args={[portal.radius, 16, 16]}
        visible={false}
      />
      
      {/* Indicador visual del portal */}
      <Sphere
        args={[0.5, 16, 16]}
        position={[0, 0, 0]}
      >
        <meshBasicMaterial
          color={isPlayerNear ? "#00ff00" : "#0099ff"}
          transparent
          opacity={isPlayerNear ? 0.8 : 0.3}
        />
      </Sphere>

      {/* Efecto de partículas cuando está activo */}
      {isPlayerNear && (
        <Sphere
          args={[1, 16, 16]}
          position={[0, 0, 0]}
        >
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.1}
          />
        </Sphere>
      )}

      {/* Texto del portal */}
      {isPlayerNear && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {portal.name}
        </Text>
      )}
    </group>
  );
}
