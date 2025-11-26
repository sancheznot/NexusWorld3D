'use client';

import { useFrame } from '@react-three/fiber';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';
import { GAME_CONFIG } from '@/constants/game';

export default function CannonStepper() {
  useFrame((_, delta) => {
    const physics = getPhysicsInstance();
    if (!physics) return;
    const clamped = Math.min(delta, GAME_CONFIG.physics.maxDeltaTime);
    physics.update(clamped);
  });
  return null;
}
