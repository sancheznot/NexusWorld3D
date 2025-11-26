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

export default function TriggerZone({ data, onEnter, onExit, onInteract, debug = false }: TriggerZoneProps) {
  const [isNear, setIsNear] = useState(false);
  const [lastInteract, setLastInteract] = useState(0);
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    const playerPosition = usePlayerStore.getState().position;
    if (!playerPosition) return;
    const pos = new Vector3(data.position.x, data.position.y, data.position.z);
    const near = pos.distanceTo(playerPosition) <= data.radius;
    if (near && !isNear) {
      setIsNear(true);
      onEnter?.({ triggerId: data.id, kind: data.kind });
    } else if (!near && isNear) {
      setIsNear(false);
      onExit?.({ triggerId: data.id, kind: data.kind });
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
      <Sphere args={[data.radius, 16, 16]} visible={debug}>
        <meshBasicMaterial color={isNear ? '#22c55e' : '#3b82f6'} transparent opacity={debug ? (isNear ? 0.25 : 0.15) : 0} />
      </Sphere>
      <Text 
        position={[0, data.radius + 0.5, 0]} 
        fontSize={0.5} 
        color="white" 
        anchorX="center" 
        anchorY="middle"
        visible={isNear}
      >
        {data.name}  •  Press {GAME_CONFIG.triggers.interactKey.toUpperCase()}
      </Text>
    </group>
  );
}


