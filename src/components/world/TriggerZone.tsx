'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import type { TriggerZoneData, TriggerEvent } from '@/types/trigger.types';
import { GAME_CONFIG } from '@/constants/game';

import { usePlayerStore } from '@/store/playerStore';

interface TriggerZoneProps {
  data: TriggerZoneData;
  onEnter?: (ev: TriggerEvent) => void;
  onExit?: (ev: TriggerEvent) => void;
  onInteract?: (ev: TriggerEvent) => void;
  debug?: boolean;
}

export default function TriggerZone({ 
  data, 
  onEnter, 
  onExit, 
  onInteract, 
  debug = false,
  visibleRadius = 15, // Default visibility radius
  children 
}: TriggerZoneProps & { visibleRadius?: number; children?: React.ReactNode }) {
  const [isNear, setIsNear] = useState(false); // For interaction
  const [isVisible, setIsVisible] = useState(false); // For rendering text/visuals
  const [lastInteract, setLastInteract] = useState(0);
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    const playerPosition = usePlayerStore.getState().position;
    if (!playerPosition) return;
    const pos = new Vector3(data.position.x, data.position.y, data.position.z);
    const dist = pos.distanceTo(playerPosition);
    
    // Interaction logic (strict radius)
    const near = dist <= data.radius;
    if (near && !isNear) {
      setIsNear(true);
      onEnter?.({ triggerId: data.id, kind: data.kind });
    } else if (!near && isNear) {
      setIsNear(false);
      onExit?.({ triggerId: data.id, kind: data.kind });
    }

    // Visibility logic (extended radius)
    const visible = dist <= visibleRadius;
    if (visible !== isVisible) {
      setIsVisible(visible);
    }
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isNear) return;
      if (e.key.toLowerCase() === GAME_CONFIG.triggers.interactKey) {
        const now = Date.now();
        if (now - lastInteract < GAME_CONFIG.triggers.cooldownMs) return;
        setLastInteract(now);
        onInteract?.({ triggerId: data.id, kind: data.kind });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isNear, lastInteract, onInteract, data.id, data.kind]);

  return (
    <group position={[data.position.x, data.position.y, data.position.z]}>
      {/* Debug sphere - only visible in debug mode */}
      <Sphere args={[data.radius, 16, 16]} visible={debug}>
        <meshBasicMaterial color={isNear ? '#22c55e' : '#3b82f6'} transparent opacity={debug ? (isNear ? 0.25 : 0.15) : 0} />
      </Sphere>

      {/* Custom visuals (e.g. beams) */}
      {children}

      {/* Interaction Text */}
      <Text 
        position={[0, 1.2, 0]} // Lower height (chest level)
        fontSize={0.5} 
        color="white" 
        anchorX="center" 
        anchorY="middle"
        visible={isVisible} // Visible from further away
      >
        {data.name}
      </Text>
      
      {/* Interaction Hint - Only visible when close enough to interact */}
      <Text 
        position={[0, 0.7, 0]} 
        fontSize={0.3} 
        color={isNear ? "#4ade80" : "#9ca3af"} 
        anchorX="center" 
        anchorY="middle"
        visible={isVisible}
      >
        {isNear ? `Press ${GAME_CONFIG.triggers.interactKey.toUpperCase()}` : `${Math.round(data.radius)}m`}
      </Text>
    </group>
  );
}


